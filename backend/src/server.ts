import fastify from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { ASREngine } from './services/ASREngine';
import { Server } from 'socket.io';
import YTDlpWrap from 'yt-dlp-wrap';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { PassThrough } from 'stream';

import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
const ffmpegPath = ffmpegInstaller.path;

if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

declare module 'fastify' {
    interface FastifyInstance {
        io: Server;
    }
}

const server = fastify({
    logger: true,
    bodyLimit: 500 * 1024 * 1024 // 500MB global limit to match multipart
});

server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-socket-id", "x-time-offset", "Authorization"]
});

server.register(fastifySocketIO, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
server.register(multipart, {
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB
    }
});

server.get('/health', async (request, reply) => {
    return { status: 'ok' };
});

server.post('/upload', async (request, reply) => {
    const data = await request.file();
    if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
    }
    console.log(`[UPLOAD] Received file: ${data.filename}, mimetype: ${data.mimetype}`);
    const buffer = await data.toBuffer();
    console.log(`[UPLOAD] Buffer created, size: ${buffer.length} bytes`);

    try {
        const deepgram = require("@deepgram/sdk").createClient(process.env.DEEPGRAM_API_KEY);
        let audioBuffer = buffer;

        // If it's a video file, extract the audio using fluent-ffmpeg reliably via temp files
        if (data.mimetype.startsWith('video/') || data.filename.endsWith('.mp4') || data.filename.endsWith('.webm') || data.filename.endsWith('.mov')) {
            console.log(`Extracting audio from video file: ${data.filename}`);

            const tempId = randomUUID();
            const tempInPath = path.join(os.tmpdir(), `${tempId}_in`);
            const tempOutPath = path.join(os.tmpdir(), `${tempId}_out.mp3`);

            await fs.promises.writeFile(tempInPath, buffer);

            audioBuffer = await new Promise<Buffer>((resolve, reject) => {
                ffmpeg(tempInPath)
                    .toFormat('mp3')
                    .on('error', (err) => {
                        console.error('ffmpeg error:', err);
                        reject(err);
                    })
                    .on('end', async () => {
                        try {
                            const outBuffer = await fs.promises.readFile(tempOutPath);
                            resolve(outBuffer);
                        } catch (err) {
                            reject(err);
                        }
                    })
                    .save(tempOutPath);
            });

            // Clean up temp files
            try {
                await fs.promises.unlink(tempInPath);
                await fs.promises.unlink(tempOutPath);
            } catch (cleanupErr) {
                console.warn('Failed to clean up temp files', cleanupErr);
            }

            console.log(`[UPLOAD] Audio extraction complete. Extracted buffer size: ${audioBuffer.length} bytes`);
        }

        console.log('[UPLOAD] Sending buffer to Deepgram natively via fetch...');

        const dgResponse = await fetch('https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true', {
            method: 'POST',
            headers: {
                'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
                'Content-Type': data.mimetype.startsWith('video/') || data.filename.endsWith('.mp4') ? 'audio/mp3' : data.mimetype
            },
            body: audioBuffer as any
        });

        if (!dgResponse.ok) {
            const errText = await dgResponse.text();
            throw new Error(`Deepgram API returned ${dgResponse.status}: ${errText}`);
        }

        const result = await dgResponse.json();
        const error = null; // compatibility with existing code

        if (error) throw error;

        const socketId = (request.query as any).socketId as string;
        const timeOffsetStr = (request.query as any).timeOffset as string;
        const timeOffset = timeOffsetStr ? parseFloat(timeOffsetStr) : 0;

        console.log(`[UPLOAD] SocketId target: ${socketId}`);
        console.log(`[UPLOAD] Deepgram result channel length: ${result?.results?.channels?.length}`);

        if (socketId && result?.results?.channels?.[0]?.alternatives?.[0]) {
            const alternative = result.results.channels[0].alternatives[0];
            const words = alternative.words || [];
            console.log(`[UPLOAD] Processing ${words.length} words via socketId: ${socketId}`);

            // Re-batch standard words into chunks of approx 10 words to simulate utterances since we disabled the true utterances parameter
            let currentSentence: string[] = [];
            let currentStart = 0;
            let currentWords: any[] = [];

            words.forEach((w: any, index: number) => {
                const text = w.punctuated_word || w.word;
                if (!text) return;

                if (currentSentence.length === 0) {
                    currentStart = w.start;
                }

                currentSentence.push(text);
                currentWords.push(w);

                // create a sentence chunk either on punctuation or every 10 words
                if (text.match(/[.!?]/) || currentSentence.length >= 10 || index === words.length - 1) {
                    (server as any).io.to(socketId).emit('transcript', {
                        text: currentSentence.join(' '),
                        isFinal: true,
                        confidence: alternative.confidence,
                        timestamp: currentStart + timeOffset,
                        words: [...currentWords]
                    });

                    currentSentence = [];
                    currentWords = [];
                }
            });
        }

        return { message: 'Upload transcribed and streamed via utterances', size: buffer.length };
    } catch (err: any) {
        console.error("Deepgram Prerecorded Error Object:", err);
        return reply.status(500).send({
            error: 'Transcription failed',
            details: err?.message || 'No Error Message',
            rawError: JSON.parse(JSON.stringify(err, Object.getOwnPropertyNames(err)))
        });
    }
});

server.ready().then(() => {
    (server as any).io.on('connection', (socket: any) => {
        console.log('Client connected:', socket.id);

        let asrEngine: ASREngine | null = null;

        socket.on('start_stream', (cumulativeTimeOffset: number = 0) => {
            if (asrEngine) {
                asrEngine.close();
            }
            asrEngine = new ASREngine(socket, cumulativeTimeOffset);
        });

        socket.on('start_youtube_stream', async (url: string) => {
            try {
                console.log("Starting YouTube Stream for URL:", url);
                if (asrEngine) {
                    asrEngine.close();
                }
                // Pass encoding so Deepgram knows the raw PCM format from ffmpeg
                asrEngine = new ASREngine(socket, 0, { encoding: 'linear16', sample_rate: 16000, channels: 1 });

                const { spawn } = require('child_process');
                const https = require('https');
                let ytdlpProc: any = null;
                let ffmpegProc: any = null;

                const ytDlpWrap = new YTDlpWrap();

                // Fallback: pipe yt-dlp output through ffmpeg (used if iOS URL extraction fails)
                const startStream = () => {
                    console.log('[YouTube] Starting yt-dlp-wrap pipe approach...');

                    ytdlpProc = ytDlpWrap.exec([
                        url,
                        '-f', 'bestaudio/best',
                        '-o', '-',
                        '--no-playlist',
                        '--quiet',
                        '--ffmpeg-location', ffmpegPath,
                        '--extractor-args', 'youtube:player_client=default'
                    ]);

                    ffmpegProc = spawn(ffmpegPath, [
                        '-fflags', '+nobuffer',
                        '-probesize', '5M',
                        '-analyzeduration', '5M',
                        '-i', 'pipe:0',
                        '-f', 's16le',
                        '-ar', '16000',
                        '-ac', '1',
                        'pipe:1'
                    ]);

                    ytdlpProc.stdout.pipe(ffmpegProc.stdin);
                    ffmpegProc.stdout.on('data', (chunk: Buffer) => {
                        if (asrEngine) asrEngine.processAudioStream(chunk as any);
                    });

                    ytdlpProc.stderr.on('data', (d: Buffer) => {
                        const msg = d.toString();
                        console.error('[yt-dlp pipe]', msg);
                        if (msg.includes('ERROR') || msg.includes('HTTP Error 403') || msg.includes('Sign in')) {
                            socket.emit('asr_error', 'YouTube blocked extraction: ' + msg.substring(0, 100));
                        }
                    });
                    ytdlpProc.on('error', (err: any) => {
                        console.error('[yt-dlp fallback] failed to start:', err.message);
                        socket.emit('asr_error', 'YouTube extractor failed to start. ' + err.message);
                    });
                    ytdlpProc.on('close', () => { try { ffmpegProc?.stdin?.end(); } catch (_) { } });

                    ffmpegProc.on('error', (err: any) => {
                        console.error('[ffmpeg pipe] error:', err.message);
                        socket.emit('asr_error', 'FFmpeg failed: ' + err.message);
                    });
                    ffmpegProc.on('close', (code: number) => console.log(`[ffmpeg fallback] Exited ${code}`));
                };

                // Ensure yt-dlp binary exists before starting
                ytDlpWrap.getVersion().then(() => {
                    startStream();
                }).catch(async (e: any) => {
                    console.log('[yt-dlp] Downloading binary via wrap (one-time)...');
                    try {
                        await YTDlpWrap.downloadFromGithub();
                        console.log('[yt-dlp] Binary ready.');
                        startStream();
                    } catch (dlErr: any) {
                        console.error('[yt-dlp] Download failed:', dlErr.message);
                        socket.emit('asr_error', 'Failed to install stream extractor: ' + dlErr.message);
                    }
                });

                const cleanup = () => {
                    try { ytdlpProc?.kill('SIGKILL'); } catch (_) { }
                    try { ffmpegProc?.kill('SIGKILL'); } catch (_) { }
                };

                socket.on('stop_stream', cleanup);
                socket.on('disconnect', cleanup);
            } catch (globalErr: any) {
                console.error("[start_youtube_stream] FATAL ERROR:", globalErr);
                socket.emit("asr_error", "Internal server error starting stream: " + globalErr.message);
            }
        });

        socket.on('audio_chunk', (audioData: ArrayBuffer) => {
            if (asrEngine) {
                asrEngine.processAudioStream(audioData as any);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
            if (asrEngine) {
                asrEngine.close();
            }
        });
    });
});

const start = async () => {
    try {
        const port = parseInt(process.env.PORT || '3001', 10);
        await server.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on ${(server.server.address() as any).port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();

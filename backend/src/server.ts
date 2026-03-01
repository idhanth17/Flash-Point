import fastify from 'fastify';
import fastifySocketIO from 'fastify-socket.io';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import { ASREngine } from './services/ASREngine';
import { Server } from 'socket.io';

declare module 'fastify' {
    interface FastifyInstance {
        io: Server;
    }
}

const server = fastify({ logger: true });

server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"]
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
    const buffer = await data.toBuffer();

    try {
        const deepgram = require("@deepgram/sdk").createClient(process.env.DEEPGRAM_API_KEY);
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            buffer,
            {
                model: "nova-3",
                smart_format: true,
            }
        );

        if (error) throw error;

        const socketId = request.headers['x-socket-id'] as string;
        const timeOffsetStr = request.headers['x-time-offset'] as string;
        const timeOffset = timeOffsetStr ? parseFloat(timeOffsetStr) : 0;

        if (socketId && result?.results?.channels?.[0]?.alternatives?.[0]) {
            const alternative = result.results.channels[0].alternatives[0];
            const words = alternative.words || [];

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
    } catch (err) {
        console.error("Deepgram Prerecorded Error:", err);
        return reply.status(500).send({ error: 'Transcription failed' });
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
        await server.listen({ port: 3001, host: '0.0.0.0' });
        console.log(`Server listening on \${(server.server.address() as any).port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();

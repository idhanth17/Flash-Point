import { createClient, LiveClient } from "@deepgram/sdk";
import { Socket } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const deepgramApiKey = process.env.DEEPGRAM_API_KEY;

export class ASREngine {
    private deepgramLive: LiveClient | null = null;
    private socket: Socket;
    private cumulativeTimeOffset: number;
    private audioBuffer: Buffer[] = [];

    constructor(socket: Socket, cumulativeTimeOffset: number = 0) {
        this.socket = socket;
        this.cumulativeTimeOffset = cumulativeTimeOffset;
        this.initializeDeepgram();
    }

    private initializeDeepgram() {
        if (!deepgramApiKey) {
            console.warn("DEEPGRAM_API_KEY is not set. Deepgram ASREngine will not function.");
            return;
        }

        const deepgram = createClient(deepgramApiKey);

        // Create live connection
        this.deepgramLive = deepgram.listen.live({
            model: "nova-3",
            language: "en",
            smart_format: true,
            interim_results: true
        });

        let streamStartTime: number | null = null;
        this.deepgramLive.on("open", () => {
            console.log("Deepgram connection opened for socket:", this.socket.id);
            streamStartTime = Date.now();
            this.socket.emit("deepgram_ready");

            // Flush any buffered audio chunks
            while (this.audioBuffer.length > 0) {
                const chunk = this.audioBuffer.shift();
                if (chunk && this.deepgramLive) {
                    this.deepgramLive.send(chunk as any);
                }
            }
        });

        this.deepgramLive.on("Results", (data: any) => {
            const isFinal = data.is_final;
            const transcript = data.channel.alternatives[0].transcript;
            const confidence = data.channel.alternatives[0].confidence;
            const words = data.channel.alternatives[0].words;

            if (transcript && transcript.length > 0) {
                // Prioritize Deepgram's exact audio-relative timestamp from the word data
                let streamTime = 0;
                if (words && words.length > 0 && typeof words[0].start === 'number') {
                    streamTime = words[0].start;
                } else if (streamStartTime) {
                    streamTime = (Date.now() - streamStartTime) / 1000;
                }

                let timestamp = streamTime + this.cumulativeTimeOffset;
                this.socket.emit("transcript", {
                    text: transcript,
                    isFinal,
                    confidence,
                    words,
                    timestamp,
                });
            }
        });

        this.deepgramLive.on("error", (error: any) => {
            console.error("Deepgram Error:", error);
            this.socket.emit("asr_error", "Deepgram processing error");
        });

        this.deepgramLive.on("close", () => {
            console.log("Deepgram connection closed");
        });
    }

    public processAudioStream(data: ArrayBuffer) {
        if (this.deepgramLive && this.deepgramLive.getReadyState() === 1) {
            // Convert ArrayBuffer to Buffer for Deepgram WebSocket
            this.deepgramLive.send(Buffer.from(data) as any);
        } else if (this.deepgramLive) {
            this.audioBuffer.push(Buffer.from(data));
        }
    }

    public close() {
        if (this.deepgramLive) {
            this.deepgramLive.requestClose();
            this.deepgramLive = null;
        }
    }
}

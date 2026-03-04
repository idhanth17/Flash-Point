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
    private dgOptions: any;
    private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

    constructor(socket: Socket, cumulativeTimeOffset: number = 0, options: any = {}) {
        this.socket = socket;
        this.cumulativeTimeOffset = cumulativeTimeOffset;
        this.dgOptions = options;
        this.initializeDeepgram();
    }

    private stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
    }

    private initializeDeepgram() {
        if (!deepgramApiKey) {
            console.error("[ASREngine] DEEPGRAM_API_KEY is not set on the server!");
            this.socket.emit("asr_error", "Server misconfiguration: DEEPGRAM_API_KEY is missing. Please set it in Railway environment variables.");
            return;
        }

        const deepgram = createClient(deepgramApiKey);

        // IMPORTANT: Use lowercase 'keepalive' with string value 'true'.
        // This is what Deepgram accepts as a URL query param (?keepalive=true).
        // Capital 'keepAlive' gets serialized differently and causes connection rejection.
        this.deepgramLive = deepgram.listen.live({
            model: "nova-3",
            language: "en",
            smart_format: true,
            interim_results: true,
            keepalive: "true",
            ...this.dgOptions
        });

        let streamStartTime: number | null = null;

        this.deepgramLive.on("open", () => {
            console.log("Deepgram connection opened for socket:", this.socket.id);
            streamStartTime = Date.now();
            this.socket.emit("deepgram_ready");

            // Send KeepAlive pings every 10s to prevent Deepgram's 60s idle timeout.
            // deepgramLive.keepAlive() sends: {"type": "KeepAlive"} over the WebSocket.
            this.keepAliveInterval = setInterval(() => {
                if (this.deepgramLive && this.deepgramLive.getReadyState() === 1) {
                    this.deepgramLive.keepAlive();
                }
            }, 10000);

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
                let streamTime = 0;
                if (words && words.length > 0 && typeof words[0].start === 'number') {
                    streamTime = words[0].start;
                } else if (streamStartTime) {
                    streamTime = (Date.now() - streamStartTime) / 1000;
                }

                const timestamp = streamTime + this.cumulativeTimeOffset;
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
            this.stopKeepAlive();
            this.socket.emit("asr_error", "Deepgram processing error");
        });

        this.deepgramLive.on("close", () => {
            console.log("Deepgram connection closed");
            this.stopKeepAlive();
        });
    }

    public processAudioStream(data: ArrayBuffer) {
        if (this.deepgramLive && this.deepgramLive.getReadyState() === 1) {
            this.deepgramLive.send(Buffer.from(data) as any);
        } else if (this.deepgramLive) {
            this.audioBuffer.push(Buffer.from(data));
        }
    }

    public close() {
        this.stopKeepAlive();
        if (this.deepgramLive) {
            this.deepgramLive.requestClose();
            this.deepgramLive = null;
        }
    }
}

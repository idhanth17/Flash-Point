// Basic canvas waveform
import { useEffect, useRef } from 'react';

export function WaveformVisualizer({ isRecording, stream }: { isRecording: boolean; stream: MediaStream | null }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);
    const analyzerRef = useRef<AnalyserNode | null>(null);

    useEffect(() => {
        if (!isRecording || !stream || !canvasRef.current) {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            return;
        }

        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyzer = audioCtx.createAnalyser();
        analyzer.fftSize = 256;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);
            analyzer.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = dataArray[i] / 2;
                ctx.fillStyle = `rgba(255, 255, 255, ${(barHeight + 50) / 255})`;
                ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
                x += barWidth + 1;
            }
        };

        draw();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            source.disconnect();
            analyzer.disconnect();
            audioCtx.close();
        };
    }, [isRecording, stream]);

    return (
        <div className="h-32 w-full bg-zinc-950/80 rounded-2xl overflow-hidden border border-zinc-800 p-2 shadow-xl backdrop-blur-md">
            <canvas
                ref={canvasRef}
                width={800}
                height={100}
                className="w-full h-full opacity-100"
            />
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';
import { useAppStore, useActiveChannel, useUIStore } from '@/lib/store';

const highlightWordInText = (text: string, wordToHighlight: string, isActive: boolean) => {
    if (!isActive) return <>{text}</>;
    const parts = text.split(new RegExp(`(${wordToHighlight})`, 'gi'));
    return (
        <>
            {parts.map((p, i) =>
                p.toLowerCase() === wordToHighlight.toLowerCase() ? (
                    <span key={i} className="text-red-500 font-bold bg-red-500/10 rounded px-1 transition-all duration-300">{p}</span>
                ) : p
            )}
        </>
    );
};

export function TranscriptWaterfall({ socket }: { socket: any }) {
    const channel = useActiveChannel();
    const addTranscript = useAppStore(state => state.addTranscript);
    const scrollRef = useRef<HTMLDivElement>(null);
    const activeHighlight = useUIStore(state => state.activeHighlight);
    const clearHighlight = useUIStore(state => state.clearHighlight);
    const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

    // Web worker reference
    const workerRef = useRef<Worker | null>(null);
    const addMatch = useAppStore(state => state.addMatch);

    useEffect(() => {
        workerRef.current = new Worker(new URL('../workers/keyword.worker.ts', import.meta.url));
        workerRef.current.onmessage = (e) => {
            if (e.data.type === 'match') {
                addMatch(e.data.data);
            }
        };
        return () => workerRef.current?.terminate();
    }, [addMatch]);

    useEffect(() => {
        if (!socket) return;

        // Ensure we don't leak listeners
        const handleTranscript = (data: any) => {
            if (!useAppStore.getState().activeChannelId) return; // ignore if no channel active

            // Ensure unique key even if events arrive synchronously from backend
            const uniqueId = Date.now().toString() + Math.random().toString(36).substring(2, 9);

            addTranscript({
                id: uniqueId,
                text: data.text,
                isFinal: data.isFinal,
                confidence: data.confidence,
                timestamp: data.timestamp || 0
            });

            // Send to worker. Need to pass the active channel's keywords.
            const currentChannel = useAppStore.getState().channels.find(c => c.id === useAppStore.getState().activeChannelId);
            if (workerRef.current && currentChannel) {
                workerRef.current.postMessage({
                    transcript: data.text,
                    timestamp: data.timestamp || 0,
                    keywords: currentChannel.keywords,
                    isFinal: data.isFinal,
                    words: data.words || [],
                    transcriptId: uniqueId
                });
            }
        };

        socket.on('transcript', handleTranscript);

        return () => {
            socket.off('transcript', handleTranscript);
        };
    }, [socket, addTranscript]);

    const transcripts = channel?.transcripts || [];

    useEffect(() => {
        if (isAutoScrollEnabled && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [transcripts, isAutoScrollEnabled]);

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        // If they are within 50px of the bottom, turn auto-scroll back on
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAutoScrollEnabled(isAtBottom);
    };

    useEffect(() => {
        if (activeHighlight && Date.now() - activeHighlight.triggeredAt < 2000) {
            const el = document.getElementById(`transcript-${activeHighlight.transcriptId}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            const timeoutId = setTimeout(() => {
                clearHighlight();
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [activeHighlight, clearHighlight]);

    const formatTimestamp = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = Math.floor(s % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <div className="flex-1 bg-zinc-950 p-8 flex flex-col items-center min-w-0 w-full">
            <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="w-full max-w-4xl h-[70vh] overflow-y-auto scroll-smooth py-4 px-6 relative no-scrollbar"
            >
                <div className="flex flex-col gap-3 font-sans w-full pb-32">
                    {transcripts.map((t) => {
                        const isHighlighted = activeHighlight?.transcriptId === t.id && (Date.now() - activeHighlight.triggeredAt < 2000);
                        return (
                            <div
                                key={t.id}
                                id={`transcript-${t.id}`}
                                className={`flex gap-4 items-start transition-all duration-300 w-full ${t.isFinal ? 'text-zinc-100' : 'text-zinc-500 italic'}`}
                                style={{ opacity: t.isFinal ? 1 : Math.max(0.4, t.confidence) }}
                            >
                                <span className="text-zinc-500 text-sm font-mono mt-1 w-12 shrink-0">{formatTimestamp(t.timestamp)}</span>
                                <span className="text-2xl break-words whitespace-pre-wrap flex-1">
                                    {isHighlighted && activeHighlight ?
                                        highlightWordInText(t.text, activeHighlight.word, true) :
                                        t.text
                                    }
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Fade out mask for top */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-zinc-950 to-transparent pointer-events-none" />
        </div>
    );
}

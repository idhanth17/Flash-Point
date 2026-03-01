import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Keyword {
    id: string;
    word: string;
}

export interface Match {
    timestamp: number;
    word: string;
    isFinal: boolean;
    transcriptId: string;
}

export interface Transcript {
    id: string;
    text: string;
    isFinal: boolean;
    confidence: number;
    timestamp: number;
}

export interface Channel {
    id: string;
    name: string;
    description: string;
    keywords: Keyword[];
    matches: Match[];
    transcripts: Transcript[];
    hasAudio: boolean;
}

interface AppState {
    channels: Channel[];
    activeChannelId: string | null;

    // Channel Actions
    createChannel: (name: string, description: string) => void;
    deleteChannel: (id: string) => void;
    setActiveChannel: (id: string | null) => void;

    // Active Channel Configuration Actions
    addKeyword: (word: string) => void;
    removeKeyword: (id: string) => void;
    setHasAudio: (hasAudio: boolean) => void;

    // Active Channel Data Actions
    addMatch: (match: Match) => void;
    addTranscript: (transcript: Transcript) => void;
    clearAudio: () => void;
    deleteTranscriptsAndMatches: () => void; // similar to clearAudio but doesn't change hasAudio, or maybe clearAudio sets hasAudio false
}

export const useAppStore = create<AppState>()(
    persist(
        (set) => ({
            channels: [],
            activeChannelId: null,

            createChannel: (name, description) => set((state) => {
                const newChannel: Channel = {
                    id: Date.now().toString(),
                    name,
                    description,
                    keywords: [], // No default keywords initially
                    matches: [],
                    transcripts: [],
                    hasAudio: false
                };
                return { channels: [...state.channels, newChannel] };
            }),

            deleteChannel: (id) => set((state) => ({
                channels: state.channels.filter(c => c.id !== id),
                activeChannelId: state.activeChannelId === id ? null : state.activeChannelId
            })),

            setActiveChannel: (id) => set({ activeChannelId: id }),

            addKeyword: (word) => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c =>
                        c.id === state.activeChannelId
                            ? { ...c, keywords: [...c.keywords, { id: Date.now().toString(), word: word.toLowerCase() }] }
                            : c
                    )
                };
            }),

            removeKeyword: (id) => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c =>
                        c.id === state.activeChannelId
                            ? { ...c, keywords: c.keywords.filter(k => k.id !== id) }
                            : c
                    )
                };
            }),

            setHasAudio: (hasAudio) => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c =>
                        c.id === state.activeChannelId
                            ? { ...c, hasAudio }
                            : c
                    )
                };
            }),

            addMatch: (match) => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c => {
                        if (c.id === state.activeChannelId) {
                            // Prevent duplicate matches from overlapping utterance chunks
                            const isDuplicate = c.matches.some(
                                m => m.word === match.word && Math.abs(m.timestamp - match.timestamp) < 0.5
                            );
                            if (isDuplicate) return c;
                            return { ...c, matches: [...c.matches, match].slice(-50000) };
                        }
                        return c;
                    })
                };
            }),

            addTranscript: (transcript) => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c => {
                        if (c.id === state.activeChannelId) {
                            return { ...c, transcripts: [...c.transcripts, transcript].slice(-50000) };
                        }
                        return c;
                    })
                };
            }),

            clearAudio: () => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c =>
                        c.id === state.activeChannelId
                            ? { ...c, matches: [], transcripts: [], hasAudio: false }
                            : c
                    )
                };
            }),

            deleteTranscriptsAndMatches: () => set((state) => {
                if (!state.activeChannelId) return state;
                return {
                    channels: state.channels.map(c =>
                        c.id === state.activeChannelId
                            ? { ...c, matches: [], transcripts: [] }
                            : c
                    )
                };
            })
        }),
        {
            name: 'flashpoint-storage', // name of item in storage (must be unique)
        }
    )
);

// Helper selectors
export const useActiveChannel = () => {
    const channels = useAppStore(state => state.channels);
    const activeChannelId = useAppStore(state => state.activeChannelId);
    return channels.find(c => c.id === activeChannelId) || null;
};

interface UIState {
    activeHighlight: { word: string, transcriptId: string, triggeredAt: number } | null;
    setHighlight: (word: string, transcriptId: string) => void;
    clearHighlight: () => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeHighlight: null,
    setHighlight: (word, transcriptId) => set({ activeHighlight: { word, transcriptId, triggeredAt: Date.now() } }),
    clearHighlight: () => set({ activeHighlight: null })
}));

import { useState } from 'react';
import { useAppStore, useActiveChannel } from '@/lib/store';
import { Plus, X, Upload, Mic, ArrowLeft, Youtube, Loader2 } from 'lucide-react';

export function ChannelSetup({ onStartLive, onUpload, onStartYouTube }: {
    onStartLive: () => void;
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onStartYouTube: (url: string) => void;
}) {
    const channel = useActiveChannel();
    const addKeyword = useAppStore(state => state.addKeyword);
    const removeKeyword = useAppStore(state => state.removeKeyword);
    const setActiveChannel = useAppStore(state => state.setActiveChannel);
    const [newKeyword, setNewKeyword] = useState('');
    const [ytUrl, setYtUrl] = useState('');
    const [isLivePending, setIsLivePending] = useState(false);

    if (!channel) return null;

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newKeyword.trim()) {
            addKeyword(newKeyword.trim());
            setNewKeyword('');
        }
    };

    const handleLive = async () => {
        setIsLivePending(true);
        try {
            await onStartLive();
        } finally {
            // parent will navigate away on success, but reset just in case
            setIsLivePending(false);
        }
    };

    return (
        <div className="flex-1 bg-zinc-950 flex flex-col items-center overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-2xl px-8 py-10">
                <button
                    onClick={() => setActiveChannel(null)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors mb-8 text-sm font-medium group"
                >
                    <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Channels
                </button>

                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-zinc-100">{channel.name}</h1>
                    {channel.description && (
                        <p className="text-zinc-400 mt-1 text-sm">{channel.description}</p>
                    )}
                </div>

                {/* Step 1: Keywords */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50 rounded-l-2xl" />
                    <div className="ml-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Step 1</span>
                        </div>
                        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Define Keywords</h2>
                        <p className="text-sm text-zinc-500 mb-5">Words or phrases to monitor and trigger live alerts.</p>

                        <form onSubmit={handleAddKeyword} className="flex gap-2 mb-4">
                            <input
                                type="text"
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                placeholder="Add a keyword..."
                                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!newKeyword.trim()}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium"
                            >
                                <Plus size={18} />
                            </button>
                        </form>

                        <div className="flex flex-wrap gap-2">
                            {channel.keywords.length === 0 ? (
                                <span className="text-zinc-600 text-sm italic">No keywords yet — you can add them during the session too.</span>
                            ) : (
                                channel.keywords.map(kw => (
                                    <div key={kw.id} className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg text-sm border border-blue-500/20 font-medium">
                                        <span>{kw.word}</span>
                                        <button
                                            onClick={() => removeKeyword(kw.id)}
                                            className="hover:text-red-400 transition-colors ml-0.5"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Step 2: Audio Input */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50 rounded-l-2xl" />
                    <div className="ml-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Step 2</span>
                        </div>
                        <h2 className="text-lg font-semibold text-zinc-100 mb-1">Choose Audio Source</h2>
                        <p className="text-sm text-zinc-500 mb-5">Select how to bring audio into Flash Point.</p>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Upload File */}
                            <label className="relative flex flex-col items-center justify-center p-6 bg-zinc-950 border-2 border-zinc-800 rounded-2xl hover:border-blue-500/50 hover:bg-zinc-900 cursor-pointer transition-all group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-500/10">
                                <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-blue-500/10 border border-zinc-700 group-hover:border-blue-500/30 flex items-center justify-center mb-3 transition-all">
                                    <Upload size={18} className="text-zinc-500 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <span className="font-semibold text-zinc-200 text-sm mb-1">Upload File</span>
                                <span className="text-xs text-zinc-500">WAV, MP3, MP4</span>
                                <input type="file" accept="audio/*,video/*" className="hidden" onChange={onUpload} />
                            </label>

                            {/* Live Stream */}
                            <button
                                onClick={handleLive}
                                disabled={isLivePending}
                                className="relative flex flex-col items-center justify-center p-6 bg-zinc-950 border-2 border-zinc-800 rounded-2xl hover:border-red-500/50 hover:bg-zinc-900 cursor-pointer transition-all group hover:-translate-y-0.5 hover:shadow-lg hover:shadow-red-500/10 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
                            >
                                <div className="w-10 h-10 rounded-xl bg-zinc-800 group-hover:bg-red-500/10 border border-zinc-700 group-hover:border-red-500/30 flex items-center justify-center mb-3 transition-all">
                                    {isLivePending ? (
                                        <Loader2 size={18} className="text-red-400 fp-spinner" />
                                    ) : (
                                        <Mic size={18} className="text-zinc-500 group-hover:text-red-400 transition-colors" />
                                    )}
                                </div>
                                <span className="font-semibold text-zinc-200 text-sm mb-1">
                                    {isLivePending ? 'Starting...' : 'Live Stream'}
                                </span>
                                <span className="text-xs text-zinc-500">Mic &amp; Camera</span>
                            </button>

                            {/* YouTube Live */}
                            <div className="relative flex flex-col p-5 bg-zinc-950 border-2 border-zinc-800 rounded-2xl hover:border-red-700/40 transition-all group hover:-translate-y-0.5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center shrink-0">
                                        <Youtube size={14} className="text-white" />
                                    </div>
                                    <span className="font-semibold text-zinc-200 text-sm">YouTube Live</span>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Paste stream URL..."
                                    value={ytUrl}
                                    onChange={(e) => setYtUrl(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500 transition-colors mb-2"
                                />
                                <button
                                    onClick={() => onStartYouTube(ytUrl)}
                                    disabled={!ytUrl.trim()}
                                    className="flex items-center justify-center gap-1.5 w-full py-2 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-colors text-xs font-semibold"
                                >
                                    <Youtube size={12} />
                                    Connect Stream
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

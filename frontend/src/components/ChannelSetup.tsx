import { useState } from 'react';
import { useAppStore, useActiveChannel } from '@/lib/store';
import { Plus, X, Upload, Mic, ArrowLeft, Youtube } from 'lucide-react';

export function ChannelSetup({ onStartLive, onUpload, onStartYouTube }: { onStartLive: () => void, onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void, onStartYouTube: (url: string) => void }) {
    const channel = useActiveChannel();
    const addKeyword = useAppStore(state => state.addKeyword);
    const removeKeyword = useAppStore(state => state.removeKeyword);
    const setActiveChannel = useAppStore(state => state.setActiveChannel);
    const [newKeyword, setNewKeyword] = useState('');
    const [ytUrl, setYtUrl] = useState('');

    if (!channel) return null;

    const handleAddKeyword = (e: React.FormEvent) => {
        e.preventDefault();
        if (newKeyword.trim()) {
            addKeyword(newKeyword.trim());
            setNewKeyword('');
        }
    };

    return (
        <div className="flex-1 bg-zinc-950 p-8 flex flex-col items-center overflow-y-auto w-full">
            <div className="w-full max-w-2xl pt-10">
                <button
                    onClick={() => setActiveChannel(null)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors mb-8 font-medium"
                >
                    <ArrowLeft size={16} />
                    Back to Channels
                </button>

                <h1 className="text-3xl font-bold text-zinc-100 mb-2">{channel.name} setup</h1>
                {channel.description && (
                    <p className="text-zinc-400 mb-8">{channel.description}</p>
                )}

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">1. Define Keywords</h2>
                    <p className="text-sm text-zinc-400 mb-4">Add words or phrases you want to monitor in the audio stream.</p>

                    <form onSubmit={handleAddKeyword} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            placeholder="Add a keyword..."
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                        />
                        <button
                            type="submit"
                            disabled={!newKeyword.trim()}
                            className="p-2 bg-zinc-800 text-zinc-100 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="flex flex-wrap gap-2">
                        {channel.keywords.length === 0 ? (
                            <span className="text-zinc-500 text-sm italic">No keywords added yet.</span>
                        ) : (
                            channel.keywords.map(kw => (
                                <div key={kw.id} className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-md text-sm border border-blue-500/20 font-medium">
                                    <span>{kw.word}</span>
                                    <button
                                        onClick={() => removeKeyword(kw.id)}
                                        className="hover:text-red-400 transition-colors ml-1 p-0.5"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-zinc-100 mb-4">2. Audio Input</h2>
                    <p className="text-sm text-zinc-400 mb-6">Choose how you want to process audio for this channel.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <label className="flex flex-col items-center justify-center p-8 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer transition-all group">
                            <Upload size={32} className="text-zinc-500 group-hover:text-blue-400 mb-4 transition-colors" />
                            <span className="font-medium text-zinc-100 mb-1">Upload File</span>
                            <span className="text-xs text-zinc-500">WAV, MP3, MP4</span>
                            <input type="file" accept="audio/*,video/*" className="hidden" onChange={onUpload} />
                        </label>

                        <button
                            onClick={onStartLive}
                            className="flex flex-col items-center justify-center p-8 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/50 cursor-pointer transition-all group"
                        >
                            <Mic size={32} className="text-zinc-500 group-hover:text-red-400 mb-4 transition-colors" />
                            <span className="font-medium text-zinc-100 mb-1">Live Stream</span>
                            <span className="text-xs text-zinc-500">Microphone & Camera</span>
                        </button>

                        <div className="flex flex-col items-center justify-center p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 hover:bg-zinc-900/50 transition-all group relative">
                            <span className="font-medium text-zinc-100 mb-2">YouTube Live</span>
                            <div className="flex w-full gap-2">
                                <input
                                    type="text"
                                    placeholder="Paste URL..."
                                    value={ytUrl}
                                    onChange={(e) => setYtUrl(e.target.value)}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-red-500"
                                />
                            </div>
                            <button
                                onClick={() => onStartYouTube(ytUrl)}
                                disabled={!ytUrl.trim()}
                                className="mt-3 flex items-center justify-center gap-2 w-full py-1.5 bg-red-600 hover:bg-red-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white rounded-lg transition-colors text-xs font-medium"
                            >
                                <Youtube size={14} />
                                Start Stream
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

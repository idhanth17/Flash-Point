import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Plus, Trash2, Zap, Radio } from 'lucide-react';

export function ChannelList() {
    const channels = useAppStore(state => state.channels);
    const createChannel = useAppStore(state => state.createChannel);
    const deleteChannel = useAppStore(state => state.deleteChannel);
    const setActiveChannel = useAppStore(state => state.setActiveChannel);

    const [isCreating, setIsCreating] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            createChannel(name.trim(), description.trim());
            setName('');
            setDescription('');
            setIsCreating(false);
        }
    };

    return (
        <div className="flex-1 bg-zinc-950 flex flex-col items-center overflow-y-auto custom-scrollbar">
            {/* Hero Header */}
            <div className="w-full border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md">
                <div className="w-full max-w-4xl mx-auto px-8 py-5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                        <Zap size={20} className="text-white fill-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-100 tracking-tight leading-none">Flash Point</h1>
                        <p className="text-xs text-zinc-500 mt-0.5">Real-time audio transcription</p>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-4xl px-8 py-10">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-zinc-100">Channels</h2>
                        <p className="text-sm text-zinc-500 mt-1">Manage your transcription sessions</p>
                    </div>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all text-sm font-medium shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5"
                    >
                        <Plus size={16} />
                        New Channel
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreate} className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-2xl fp-fade-in relative">
                        <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                        <h3 className="text-lg font-semibold text-zinc-100 mb-5">Create New Channel</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                                    placeholder="e.g., Support Calls"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Description <span className="text-zinc-600 font-normal">(optional)</span></label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 min-h-[80px] transition-all resize-none"
                                    placeholder="Keywords and alerts for tier 1 support..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim()}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors text-sm font-medium"
                                >
                                    Create Channel
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.length === 0 && !isCreating ? (
                        <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                                <Radio size={28} className="text-zinc-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-zinc-400 font-medium">No channels yet</p>
                                <p className="text-sm text-zinc-600 mt-1">Create a channel to start transcribing audio</p>
                            </div>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="mt-2 flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl transition-colors text-sm font-medium"
                            >
                                <Plus size={14} />
                                Create your first channel
                            </button>
                        </div>
                    ) : (
                        channels.map(channel => (
                            <div
                                key={channel.id}
                                className="group p-5 bg-zinc-900 hover:bg-zinc-800/70 border border-zinc-800 hover:border-zinc-700 rounded-2xl transition-all cursor-pointer relative overflow-hidden hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30"
                                onClick={() => setActiveChannel(channel.id)}
                            >
                                {/* Top gradient accent on hover */}
                                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/0 group-hover:via-blue-500/50 to-transparent transition-all duration-300" />

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this channel?')) deleteChannel(channel.id);
                                    }}
                                    className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={14} />
                                </button>

                                <div className="flex items-start gap-3 mb-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${channel.hasAudio ? 'bg-green-500/10 border border-green-500/20' : 'bg-zinc-800 border border-zinc-700'}`}>
                                        <Radio size={14} className={channel.hasAudio ? 'text-green-400' : 'text-zinc-500'} />
                                    </div>
                                    <h3 className="text-base font-semibold text-zinc-100 mt-0.5">{channel.name}</h3>
                                </div>

                                {channel.description && (
                                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2 ml-11">{channel.description}</p>
                                )}

                                <div className="flex gap-3 text-xs text-zinc-500 font-medium ml-11">
                                    <span className="flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-zinc-600" />
                                        {channel.keywords.length} keyword{channel.keywords.length !== 1 ? 's' : ''}
                                    </span>
                                    <span className={`flex items-center gap-1 ${channel.hasAudio ? 'text-green-500' : ''}`}>
                                        <span className={`w-1 h-1 rounded-full ${channel.hasAudio ? 'bg-green-500' : 'bg-zinc-600'}`} />
                                        {channel.hasAudio ? 'Has audio' : 'No audio'}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

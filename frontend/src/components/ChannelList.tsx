import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Plus, Trash2 } from 'lucide-react';

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
        <div className="flex-1 bg-zinc-950 p-8 flex flex-col items-center overflow-y-auto">
            <div className="w-full max-w-4xl pt-10">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-zinc-100">Your Channels</h1>
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors font-medium"
                    >
                        <Plus size={18} />
                        Create Channel
                    </button>
                </div>

                {isCreating && (
                    <form onSubmit={handleCreate} className="mb-8 p-6 bg-zinc-900 border border-zinc-800 rounded-xl">
                        <h2 className="text-xl font-semibold text-zinc-100 mb-4">Create New Channel</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
                                    placeholder="e.g., Support Calls"
                                    autoFocus
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-blue-500 min-h-[100px]"
                                    placeholder="Keywords and alerts for tier 1 support..."
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="px-4 py-2 text-zinc-400 hover:text-zinc-100 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!name.trim()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                                >
                                    Create
                                </button>
                            </div>
                        </div>
                    </form>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {channels.length === 0 && !isCreating ? (
                        <div className="col-span-1 md:col-span-2 text-center py-12 text-zinc-500">
                            No channels yet. Create one to get started.
                        </div>
                    ) : (
                        channels.map(channel => (
                            <div
                                key={channel.id}
                                className="group p-6 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all cursor-pointer relative"
                                onClick={() => setActiveChannel(channel.id)}
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('Are you sure you want to delete this channel?')) {
                                            deleteChannel(channel.id);
                                        }
                                    }}
                                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all font-medium"
                                >
                                    <Trash2 size={16} />
                                </button>
                                <h3 className="text-xl font-semibold text-zinc-100 mb-2">{channel.name}</h3>
                                {channel.description && (
                                    <p className="text-zinc-400 text-sm mb-4 line-clamp-2">{channel.description}</p>
                                )}
                                <div className="flex gap-4 text-sm text-zinc-500 font-medium">
                                    <span>{channel.keywords.length} keywords</span>
                                    <span>{channel.hasAudio ? 'Has audio data' : 'No audio yet'}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

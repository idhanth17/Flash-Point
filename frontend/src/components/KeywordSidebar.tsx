import { useAppStore, useActiveChannel, useUIStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';

export function KeywordSidebar() {
    const channel = useActiveChannel();
    const addKeyword = useAppStore(state => state.addKeyword);
    const removeKeyword = useAppStore(state => state.removeKeyword);
    const setHighlight = useUIStore(state => state.setHighlight);
    const [newWord, setNewWord] = useState('');
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]); // Array of keyword IDs that are selected

    if (!channel) return null;

    const { keywords, matches } = channel;

    // Whenever keywords change, ensure any deleted keywords are removed from filters
    useEffect(() => {
        setSelectedFilters(prev => prev.filter(id => keywords.some(k => k.id === id)));
    }, [keywords]);

    const alertsEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        alertsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [matches]);

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (newWord.trim()) {
            addKeyword(newWord.trim());
            setNewWord('');
        }
    };

    // Calculate occurrences
    const getOccurrenceCount = (word: string) => {
        return matches.filter(m => m.word.toLowerCase() === word.toLowerCase()).length;
    };

    const toggleFilter = (id: string) => {
        setSelectedFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    // If NO filters are selected, assume they want to see ALL alerts.
    // Otherwise, only show alerts whose keyword ID is in the selectedFilters array.
    // Match alerts to keywords via the exact word string.
    const filteredMatches = selectedFilters.length === 0
        ? matches
        : matches.filter(m => {
            const keywordMatch = keywords.find(k => k.id && selectedFilters.includes(k.id));
            if (!keywordMatch) return false;
            // Since matches only track the word string, check if the match string equals a selected keyword string
            return selectedFilters.some(filterId => {
                const k = keywords.find(key => key.id === filterId);
                return k && k.word.toLowerCase() === m.word.toLowerCase();
            });
        });

    return (
        <div className="w-80 bg-zinc-950 border-r border-zinc-800 h-screen flex flex-col p-4 text-zinc-100 font-sans">
            <h2 className="text-xl font-bold tracking-tight mb-6 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Mission Control
            </h2>

            <div className="mb-8 items-start">
                <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Watchlist</h3>
                <form onSubmit={handleAdd} className="flex gap-2 mb-4">
                    <input
                        type="text"
                        className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-1.5 flex-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        placeholder="Add keyword..."
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-md transition-colors">
                        <Plus size={18} />
                    </button>
                </form>

                <div className="flex flex-col gap-2">
                    {keywords.map(k => {
                        const count = getOccurrenceCount(k.word);
                        return (
                            <div key={k.id} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 rounded-md px-3 py-2 group hover:border-zinc-700 transition-colors">
                                <span className="text-sm font-medium">{k.word} {count > 0 && <span className="text-zinc-400 font-normal ml-1">- {count}</span>}</span>
                                <button
                                    onClick={() => removeKeyword(k.id)}
                                    className="text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-1 mt-6 flex flex-col min-h-0">
                <div className="sticky top-0 z-10 bg-zinc-950 pb-2 px-6">
                    <h3 className="text-zinc-500 font-semibold mb-3 text-sm flex justify-between items-center">
                        <span>Alert Filters</span>
                    </h3>
                    {keywords.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {keywords.map(k => {
                                const isSelected = selectedFilters.includes(k.id) || selectedFilters.length === 0;
                                return (
                                    <label key={`filter-${k.id}`} className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border transition-colors ${isSelected ? 'bg-zinc-800 border-zinc-600' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => toggleFilter(k.id)}
                                        />
                                        <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-transparent border border-zinc-600'}`} />
                                        <span>{k.word}</span>
                                    </label>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-600 italic">Add keywords above to filter</p>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <h3 className="text-zinc-500 font-semibold mb-3 px-6 pt-2 text-sm flex justify-between items-center">
                        <span>Live Alerts</span>
                        <span className="bg-red-500/20 text-red-400 text-xs px-2 py-0.5 rounded-full">{filteredMatches.length}</span>
                    </h3>
                    <div className="flex flex-col gap-2 px-4 pb-4">
                        {filteredMatches.map((m, i) => {
                            const totalSeconds = Math.floor(m.timestamp);
                            const mins = Math.floor(totalSeconds / 60);
                            const secs = (totalSeconds % 60).toString().padStart(2, '0');
                            const timeStr = `${mins}:${secs}`;
                            return (
                                <div
                                    key={i}
                                    onClick={() => m.transcriptId && setHighlight(m.word, m.transcriptId)}
                                    className={`p-3 rounded-lg border cursor-pointer hover:border-red-500/50 ${m.isFinal ? 'bg-red-950/20 border-red-900/40' : 'bg-red-950/10 border-red-900/20 opacity-60'} flex justify-between items-start transition-all`}
                                >
                                    <div>
                                        <span className="text-red-400 font-bold block capitalize">{m.word}</span>
                                        <span className="text-xs text-zinc-500 font-mono mt-1 block">Uttered @ {timeStr}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={alertsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}

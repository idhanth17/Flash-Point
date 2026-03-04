import { useAppStore, useActiveChannel, useUIStore } from '@/lib/store';
import { useState, useRef, useEffect } from 'react';
import { Trash2, Plus, Zap, Bell, Tag } from 'lucide-react';

export function KeywordSidebar() {
    const channel = useActiveChannel();
    const addKeyword = useAppStore(state => state.addKeyword);
    const removeKeyword = useAppStore(state => state.removeKeyword);
    const setHighlight = useUIStore(state => state.setHighlight);
    const [newWord, setNewWord] = useState('');
    const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

    if (!channel) return null;

    const { keywords, matches } = channel;

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

    const getOccurrenceCount = (word: string) =>
        matches.filter(m => m.word.toLowerCase() === word.toLowerCase()).length;

    const toggleFilter = (id: string) => {
        setSelectedFilters(prev =>
            prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
        );
    };

    const filteredMatches = selectedFilters.length === 0
        ? matches
        : matches.filter(m =>
            selectedFilters.some(filterId => {
                const k = keywords.find(key => key.id === filterId);
                return k && k.word.toLowerCase() === m.word.toLowerCase();
            })
        );

    return (
        <div className="w-72 bg-zinc-950 border-r border-zinc-800 h-screen flex flex-col text-zinc-100 font-sans shrink-0">
            {/* Sidebar Header */}
            <div className="px-4 py-4 border-b border-zinc-800/60 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm shadow-blue-500/30">
                        <Zap size={14} className="text-white fill-white" />
                    </div>
                    <span className="text-sm font-bold text-zinc-100 tracking-tight">Mission Control</span>
                </div>
            </div>

            {/* Watchlist Section — fixed height, internally scrollable */}
            <div className="px-4 pt-4 pb-3 border-b border-zinc-800/40 flex flex-col shrink-0 max-h-[45%]">
                <div className="flex items-center gap-2 mb-3 shrink-0">
                    <Tag size={12} className="text-zinc-500" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Watchlist</h3>
                    {keywords.length > 0 && (
                        <span className="ml-auto text-xs bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-full font-mono">{keywords.length}</span>
                    )}
                </div>

                <form onSubmit={handleAdd} className="flex gap-2 mb-3 shrink-0">
                    <input
                        type="text"
                        className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 flex-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium placeholder-zinc-600"
                        placeholder="Add keyword..."
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-colors shrink-0 shadow-sm shadow-blue-500/20">
                        <Plus size={16} />
                    </button>
                </form>

                {/* Keywords list — scrollable */}
                <div className="flex flex-col gap-1.5 overflow-y-auto custom-scrollbar min-h-0">
                    {keywords.length === 0 ? (
                        <p className="text-xs text-zinc-600 italic px-1 py-2">No keywords yet. Add one above.</p>
                    ) : (
                        keywords.map(k => {
                            const count = getOccurrenceCount(k.word);
                            return (
                                <div key={k.id} className="flex items-center justify-between bg-zinc-900/60 border border-zinc-800 rounded-lg px-3 py-2 group hover:border-zinc-700 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                                        <span className="text-sm font-medium truncate">{k.word}</span>
                                        {count > 0 && (
                                            <span className="text-xs text-zinc-500 ml-1 font-mono shrink-0">×{count}</span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeKeyword(k.id)}
                                        className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0 ml-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Alerts Section — takes remaining height, scrollable */}
            <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-2">
                {/* Alert Filters */}
                {keywords.length > 0 && (
                    <div className="mb-3 shrink-0">
                        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Filter by keyword</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {keywords.map(k => {
                                const isSelected = selectedFilters.includes(k.id) || selectedFilters.length === 0;
                                return (
                                    <label key={`filter-${k.id}`} className={`cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-colors ${isSelected ? 'bg-zinc-800 border-zinc-600 text-zinc-200' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => toggleFilter(k.id)}
                                        />
                                        <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-zinc-600'}`} />
                                        {k.word}
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Live alerts header */}
                <div className="flex items-center gap-2 mb-2 shrink-0">
                    <Bell size={12} className="text-zinc-500" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Live Alerts</h3>
                    <span className={`ml-auto text-xs px-1.5 py-0.5 rounded-full font-mono font-medium ${filteredMatches.length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-500'}`}>
                        {filteredMatches.length}
                    </span>
                </div>

                {/* Scrollable alerts list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 -mx-1 px-1">
                    {filteredMatches.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 gap-2">
                            <Bell size={20} className="text-zinc-700" />
                            <p className="text-xs text-zinc-600 italic text-center">No alerts yet. Alerts appear<br />when keywords are spoken.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 pb-2">
                            {filteredMatches.map((m, i) => {
                                const totalSeconds = Math.floor(m.timestamp);
                                const mins = Math.floor(totalSeconds / 60);
                                const secs = (totalSeconds % 60).toString().padStart(2, '0');
                                const timeStr = `${mins}:${secs}`;
                                return (
                                    <div
                                        key={i}
                                        onClick={() => m.transcriptId && setHighlight(m.word, m.transcriptId)}
                                        className={`p-3 rounded-lg border-l-2 cursor-pointer transition-all hover:translate-x-0.5 ${m.isFinal
                                            ? 'bg-red-950/25 border-red-500/60 hover:bg-red-950/40'
                                            : 'bg-red-950/10 border-red-800/30 opacity-60'
                                            }`}
                                    >
                                        <span className="text-red-400 font-bold text-sm block capitalize">{m.word}</span>
                                        <span className="text-xs text-zinc-500 font-mono mt-0.5 block">@ {timeStr}</span>
                                    </div>
                                );
                            })}
                            <div ref={alertsEndRef} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

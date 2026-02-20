'use client';

import { useState, useEffect } from 'react';
import { subscribeRoster, saveRoster, RosterSide } from '@/lib/roster';
import type { Player } from '@/types';

interface Props {
    gameId: string;
    homeTeamName?: string;
    awayTeamName?: string;
}

function generateId() {
    return Math.random().toString(36).slice(2, 10);
}

const POSITIONS = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];

interface TeamRosterEditorProps {
    gameId: string;
    side: RosterSide;
    teamName: string;
    players: Player[];
}

function TeamRosterEditor({ gameId, side, teamName, players }: TeamRosterEditorProps) {
    const [name, setName] = useState('');
    const [number, setNumber] = useState('');
    const [position, setPosition] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const sorted = [...players].sort((a, b) => a.order - b.order);

    const persist = (updated: Player[]) => saveRoster(gameId, side, updated);

    const addPlayer = () => {
        if (!name.trim()) return;
        const newPlayer: Player = {
            id: generateId(),
            name: name.trim(),
            number: number.trim() || String(players.length + 1),
            position: position || undefined,
            order: players.length,
        };
        persist([...players, newPlayer]);
        setName('');
        setNumber('');
        setPosition('');
    };

    const removePlayer = (id: string) => {
        const updated = players.filter(p => p.id !== id).map((p, i) => ({ ...p, order: i }));
        persist(updated);
    };

    const saveEdit = (id: string) => {
        if (!editName.trim()) return;
        const updated = players.map(p => p.id === id ? { ...p, name: editName.trim() } : p);
        persist(updated);
        setEditingId(null);
    };

    const headerColor = side === 'home' ? 'text-cyan-400' : 'text-amber-400';
    const accentBg = side === 'home' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' : 'bg-amber-500/20 border-amber-500/30 text-amber-400';

    return (
        <div className="flex-1 min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${headerColor}`}>{teamName}</p>

            {/* Lineup */}
            <div className="space-y-1 mb-3 max-h-64 overflow-y-auto">
                {sorted.length === 0 && (
                    <p className="text-white/20 text-xs text-center py-4">No players yet</p>
                )}
                {sorted.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-2.5 py-1.5 group">
                        {/* Order + Number */}
                        <span className="text-[10px] font-black text-white/20 w-4 flex-shrink-0">{i + 1}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${accentBg} flex-shrink-0`}>
                            #{p.number}
                        </span>
                        {p.position && (
                            <span className="text-[9px] font-black text-white/30 flex-shrink-0">{p.position}</span>
                        )}

                        {/* Name — tap to edit */}
                        {editingId === p.id ? (
                            <input
                                autoFocus
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onBlur={() => saveEdit(p.id)}
                                onKeyDown={e => { if (e.key === 'Enter') saveEdit(p.id); if (e.key === 'Escape') setEditingId(null); }}
                                className="flex-1 bg-transparent text-xs font-bold text-white outline-none border-b border-white/30 min-w-0"
                            />
                        ) : (
                            <button
                                onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                                className="flex-1 text-xs font-bold text-white text-left truncate hover:text-white/70 transition-colors"
                            >
                                {p.name}
                            </button>
                        )}

                        {/* Remove */}
                        <button
                            onClick={() => removePlayer(p.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/20 hover:text-red-400 text-sm leading-none flex-shrink-0"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>

            {/* Add player row */}
            <div className="flex gap-1">
                <input
                    value={number}
                    onChange={e => setNumber(e.target.value)}
                    placeholder="#"
                    className="w-10 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-white/30 flex-shrink-0"
                />
                <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addPlayer(); }}
                    placeholder="Player name"
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-bold text-white placeholder:text-white/20 outline-none focus:border-white/30 min-w-0"
                />
                <select
                    value={position}
                    onChange={e => setPosition(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-1.5 py-1.5 text-xs font-bold text-white outline-none focus:border-white/30 flex-shrink-0"
                >
                    <option value="">Pos</option>
                    {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
                <button
                    onClick={addPlayer}
                    className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-2.5 py-1.5 text-white font-black text-sm transition-colors flex-shrink-0"
                >
                    +
                </button>
            </div>
        </div>
    );
}

export default function RosterEditor({ gameId, homeTeamName = 'Home', awayTeamName = 'Away' }: Props) {
    const [roster, setRoster] = useState<{ home: Player[]; away: Player[] }>({ home: [], away: [] });

    useEffect(() => {
        const unsub = subscribeRoster(gameId, setRoster);
        return () => unsub();
    }, [gameId]);

    return (
        <div>
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-4 text-center">
                Tap a name to edit · Hover to remove
            </p>
            <div className="flex gap-4">
                <TeamRosterEditor
                    gameId={gameId}
                    side="away"
                    teamName={awayTeamName}
                    players={roster.away}
                />
                <div className="w-px bg-white/10 flex-shrink-0" />
                <TeamRosterEditor
                    gameId={gameId}
                    side="home"
                    teamName={homeTeamName}
                    players={roster.home}
                />
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribePlayLog } from '@/lib/playByPlay';
import type { PlayEvent } from '@/types';

interface Props {
    gameId: string;
}

const RESULT_COLORS: Record<string, string> = {
    Ball: 'bg-green-500/20 text-green-400 border-green-500/30',
    Strike: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    Foul: 'bg-white/10 text-white/60 border-white/20',
    Single: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    Double: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    Triple: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    'Home Run': 'bg-red-500/20 text-red-400 border-red-500/30',
    Out: 'bg-red-500/20 text-red-400 border-red-500/30',
    Strikeout: 'bg-red-500/20 text-red-400 border-red-500/30',
    Walk: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    'Run Scored': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

function resultColor(result: string) {
    // Partial match — e.g. "Strikeout" from auto-apply
    for (const k of Object.keys(RESULT_COLORS)) {
        if (result.startsWith(k)) return RESULT_COLORS[k];
    }
    return 'bg-white/10 text-white/50 border-white/10';
}

function inningLabel(n: number, isTop: boolean) {
    const suffix = n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th';
    return `${isTop ? '▲' : '▼'} ${n}${suffix}`;
}

function MiniBase({ on }: { on: boolean }) {
    return <div className={`w-2 h-2 rotate-45 rounded-[1px] ${on ? 'bg-amber-400' : 'bg-white/15'}`} />;
}

export default function PlayLog({ gameId }: Props) {
    const [events, setEvents] = useState<PlayEvent[]>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsub = subscribePlayLog(gameId, setEvents);
        return () => unsub();
    }, [gameId]);

    // Auto-scroll to latest
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [events.length]);

    if (events.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <span className="text-4xl mb-3">⚾</span>
                <p className="text-white/30 text-sm font-bold">No plays logged yet</p>
                <p className="text-white/20 text-xs mt-1">Plays appear here as the scorer logs them</p>
            </div>
        );
    }

    // Group events by inning half
    type InningGroup = { label: string; key: string; events: PlayEvent[] };
    const groups: InningGroup[] = [];
    for (const ev of events) {
        const key = `${ev.inning}-${ev.isTopInning ? 'top' : 'bot'}`;
        const last = groups[groups.length - 1];
        if (last?.key === key) {
            last.events.push(ev);
        } else {
            groups.push({ label: inningLabel(ev.inning, ev.isTopInning), key, events: [ev] });
        }
    }

    return (
        <div className="overflow-y-auto max-h-full">
            {groups.map((group) => (
                <div key={group.key}>
                    {/* Inning divider */}
                    <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-1.5 bg-[#0d1420]/95 backdrop-blur-sm border-y border-white/5">
                        <span className="text-[10px] font-black text-cyan-400/70 uppercase tracking-widest">{group.label}</span>
                    </div>

                    {/* Plays */}
                    {group.events.map((ev, i) => (
                        <div
                            key={ev.id ?? i}
                            className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                        >
                            {/* Pitch type */}
                            {ev.pitchType && (
                                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest flex-shrink-0 w-14 truncate">
                                    {ev.pitchType}
                                </span>
                            )}

                            {/* Result badge */}
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border flex-shrink-0 ${resultColor(ev.result)}`}>
                                {ev.result.split(' — ')[0]}
                            </span>

                            {/* Batter / Pitcher */}
                            <div className="flex-1 min-w-0">
                                {ev.batterName && (
                                    <span className="text-xs text-white/70 font-bold truncate block">{ev.batterName}</span>
                                )}
                                {ev.pitcherName && (
                                    <span className="text-[10px] text-white/30 truncate block">p: {ev.pitcherName}</span>
                                )}
                            </div>

                            {/* Mini base state */}
                            <div className="relative w-6 h-6 flex-shrink-0">
                                <MiniBase on={ev.onSecond} />
                                <div className="absolute inset-0 flex items-center justify-between px-0.5">
                                    <MiniBase on={ev.onThird} />
                                    <MiniBase on={ev.onFirst} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ))}
            <div ref={bottomRef} />
        </div>
    );
}

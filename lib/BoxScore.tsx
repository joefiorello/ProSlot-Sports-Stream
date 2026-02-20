'use client';

import { useState, useEffect } from 'react';
import { subscribeGameState, GameState } from '@/lib/gameScore';
import { subscribePlayLog } from '@/lib/playByPlay';
import type { PlayEvent } from '@/types';

interface Props {
    gameId: string;
    homeTeamName?: string;
    awayTeamName?: string;
}

/** Compute runs scored per half-inning from the play log. */
function computeLinescore(events: PlayEvent[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const ev of events) {
        const key = `${ev.inning}-${ev.isTopInning ? 'top' : 'bot'}`;
        // Count events that contain "Scored" or "Run Forced In" or "Home Run"
        const r = ev.result;
        let runs = 0;
        if (r.includes('Home Run')) {
            // Count runners + batter from base state *before* the hit
            // Play log stores base state AT TIME OF PLAY (before advance)
            runs = 1 + (ev.onFirst ? 1 : 0) + (ev.onSecond ? 1 : 0) + (ev.onThird ? 1 : 0);
        } else {
            // Extract "X Scored" from descriptions like "Single — 2 Scored"
            const m = r.match(/(\d+)\s+Scored/);
            if (m) runs = parseInt(m[1], 10);
            if (r.includes('Run Forced In') || r === 'Run Scored') runs = 1;
        }
        if (runs > 0) map.set(key, (map.get(key) ?? 0) + runs);
    }
    return map;
}

export default function BoxScore({ gameId, homeTeamName = 'Home', awayTeamName = 'Away' }: Props) {
    const [gs, setGs] = useState<GameState | null>(null);
    const [events, setEvents] = useState<PlayEvent[]>([]);

    useEffect(() => {
        const u1 = subscribeGameState(gameId, setGs);
        const u2 = subscribePlayLog(gameId, setEvents);
        return () => { u1(); u2(); };
    }, [gameId]);

    const totalInnings = Math.max(9, gs?.inning ?? 1);
    const innings = Array.from({ length: totalInnings }, (_, i) => i + 1);
    const linescore = computeLinescore(events);

    const awayRuns = gs?.awayTeam.score ?? 0;
    const homeRuns = gs?.homeTeam.score ?? 0;
    const awayHits = gs?.awayTeam.hits ?? 0;
    const homeHits = gs?.homeTeam.hits ?? 0;
    const awayErrors = gs?.awayTeam.errors ?? 0;
    const homeErrors = gs?.homeTeam.errors ?? 0;

    const cell = 'text-center text-xs font-bold tabular-nums px-2 py-2 border-r border-white/5 last:border-r-0';
    const headerCell = 'text-center text-[9px] font-black text-white/30 uppercase tracking-widest px-2 py-1.5 border-r border-white/5 last:border-r-0';

    return (
        <div className="overflow-x-auto w-full">
            <table className="w-full min-w-max text-white" style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03]">
                        <th className={`${headerCell} text-left min-w-[72px]`}>Team</th>
                        {innings.map(n => (
                            <th key={n} className={headerCell}>{n}</th>
                        ))}
                        <th className={`${headerCell} text-red-400`}>R</th>
                        <th className={`${headerCell} text-white/50`}>H</th>
                        <th className={`${headerCell} text-white/50`}>E</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Away row */}
                    <tr className="border-b border-white/5">
                        <td className={`${cell} text-left font-black text-white truncate max-w-[80px]`}>{awayTeamName}</td>
                        {innings.map(n => {
                            const key = `${n}-top`;
                            const r = linescore.get(key);
                            const isCurrent = gs?.isTopInning && gs?.inning === n;
                            return (
                                <td key={n} className={`${cell} ${isCurrent ? 'text-cyan-400' : r ? 'text-white' : 'text-white/20'}`}>
                                    {r ?? (n <= (gs?.inning ?? 0) || (gs && !gs.isTopInning && n === gs.inning) ? '0' : '—')}
                                </td>
                            );
                        })}
                        <td className={`${cell} text-red-400 font-black`}>{awayRuns}</td>
                        <td className={`${cell} text-white/60`}>{awayHits}</td>
                        <td className={`${cell} text-white/60`}>{awayErrors}</td>
                    </tr>
                    {/* Home row */}
                    <tr>
                        <td className={`${cell} text-left font-black text-white truncate max-w-[80px]`}>{homeTeamName}</td>
                        {innings.map(n => {
                            const key = `${n}-bot`;
                            const r = linescore.get(key);
                            const isCurrent = !gs?.isTopInning && gs?.inning === n;
                            return (
                                <td key={n} className={`${cell} ${isCurrent ? 'text-cyan-400' : r ? 'text-white' : 'text-white/20'}`}>
                                    {r ?? (n < (gs?.inning ?? 0) ? '0' : '—')}
                                </td>
                            );
                        })}
                        <td className={`${cell} text-red-400 font-black`}>{homeRuns}</td>
                        <td className={`${cell} text-white/60`}>{homeHits}</td>
                        <td className={`${cell} text-white/60`}>{homeErrors}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

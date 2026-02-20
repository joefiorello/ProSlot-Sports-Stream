'use client';

import { useState, useEffect } from 'react';
import { subscribeGameState, GameState } from '@/lib/gameScore';

interface Props {
    gameId: string;
    homeTeamName?: string;
    awayTeamName?: string;
}

export default function ScoreboardOverlay({ gameId, homeTeamName = 'Home', awayTeamName = 'Away' }: Props) {
    const [gs, setGs] = useState<GameState | null>(null);

    useEffect(() => {
        const unsub = subscribeGameState(gameId, (state) => setGs(state));
        return () => unsub();
    }, [gameId]);

    if (!gs) {
        // Show a default scoreboard immediately — it will update once Firestore doc is created by the scorer
        const defaultGs = {
            homeTeam: { name: homeTeamName, score: 0, hits: 0, errors: 0 },
            awayTeam: { name: awayTeamName, score: 0, hits: 0, errors: 0 },
            inning: 1, isTopInning: true,
            balls: 0, strikes: 0, outs: 0,
            onFirst: false, onSecond: false, onThird: false,
            lastPlay: '', isActive: true,
        };
        return <OverlayUI gs={defaultGs} />;
    }

    return <OverlayUI gs={gs} />;
}

function OverlayUI({ gs }: { gs: { homeTeam: { name: string; score: number; hits: number; errors: number }; awayTeam: { name: string; score: number; hits: number; errors: number }; inning: number; isTopInning: boolean; balls: number; strikes: number; outs: number; onFirst: boolean; onSecond: boolean; onThird: boolean; lastPlay: string } }) {
    const inningLabel = `${gs.isTopInning ? '▲' : '▼'}${gs.inning}`;

    return (
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none z-20">
            {/* Main Bug — bottom TV-style scoreboard */}
            <div className="absolute bottom-4 left-3 right-3">
                <div className="bg-black/85 backdrop-blur-md rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                    {/* Teams and score row */}
                    <div className="flex items-stretch">
                        {/* Away team */}
                        <div className="flex items-center gap-2.5 px-3 py-2 flex-1">
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-tight truncate">Away</span>
                                <span className="text-sm font-black text-white leading-tight truncate">{gs.awayTeam.name}</span>
                                <span className="text-[9px] text-white/30 leading-tight">{gs.awayTeam.hits}H {gs.awayTeam.errors}E</span>
                            </div>
                        </div>
                        <div className="flex items-center px-3 py-2">
                            <span className="text-3xl font-black text-white tabular-nums">{gs.awayTeam.score}</span>
                        </div>

                        {/* Divider with count + inning */}
                        <div className="flex flex-col items-center justify-center px-3 py-1 border-x border-white/10 bg-white/5 min-w-[72px]">
                            <div className="flex gap-1 mb-1">
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < gs.balls ? 'bg-green-400' : 'bg-white/20'}`} />
                                    ))}
                                </div>
                                <span className="text-white/20 text-[8px]">·</span>
                                <div className="flex gap-0.5">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < gs.strikes ? 'bg-amber-400' : 'bg-white/20'}`} />
                                    ))}
                                </div>
                            </div>
                            <span className="text-xs font-black text-white/80">{inningLabel}</span>
                            <div className="flex gap-0.5 mt-1">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${i < gs.outs ? 'bg-red-400' : 'bg-white/20'}`} />
                                ))}
                            </div>
                        </div>

                        {/* Home team */}
                        <div className="flex items-center px-3 py-2">
                            <span className="text-3xl font-black text-white tabular-nums">{gs.homeTeam.score}</span>
                        </div>
                        <div className="flex items-center gap-2.5 px-3 py-2 flex-1 justify-end text-right">
                            <div className="flex flex-col items-end min-w-0">
                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-tight truncate">Home</span>
                                <span className="text-sm font-black text-white leading-tight truncate">{gs.homeTeam.name}</span>
                                <span className="text-[9px] text-white/30 leading-tight">{gs.homeTeam.hits}H {gs.homeTeam.errors}E</span>
                            </div>
                        </div>
                    </div>

                    {/* Base Diamond mini-strip */}
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
                        <BaseMiniDiamond onFirst={gs.onFirst} onSecond={gs.onSecond} onThird={gs.onThird} />
                        {gs.lastPlay && (
                            <span className="text-[10px] text-white/50 font-medium truncate ml-2">↳ {gs.lastPlay}</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function BaseMiniDiamond({ onFirst, onSecond, onThird }: { onFirst: boolean; onSecond: boolean; onThird: boolean }) {
    const on = 'bg-amber-400';
    const off = 'bg-white/15';
    const sq = 'w-3 h-3 rotate-45 rounded-[2px]';
    return (
        <div className="relative w-10 h-10 flex-shrink-0">
            {/* Second (top) */}
            <div className={`${sq} ${onSecond ? on : off} absolute top-0 left-1/2 -translate-x-1/2`} />
            {/* Third (left) */}
            <div className={`${sq} ${onThird ? on : off} absolute left-0 top-1/2 -translate-y-1/2`} />
            {/* First (right) */}
            <div className={`${sq} ${onFirst ? on : off} absolute right-0 top-1/2 -translate-y-1/2`} />
            {/* Home (bottom) */}
            <div className={`${sq} bg-white/5 absolute bottom-0 left-1/2 -translate-x-1/2`} />
        </div>
    );
}

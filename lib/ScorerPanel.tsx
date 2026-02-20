'use client';

import { useState, useEffect, useRef } from 'react';
import {
    GameState, DEFAULT_GAME_STATE,
    initGameState, updateGameState, subscribeGameState,
    applyBall, applyFoul, applyOut, applyHit, scoreRun,
    applyCalledStrike, applySwingingStrike, applyWalk,
} from '@/lib/gameScore';
import { subscribeRoster } from '@/lib/roster';
import { addPlayEvent } from '@/lib/playByPlay';
import type { Player, PitchType } from '@/types';

interface Props {
    gameId: string;
    homeTeamName: string;
    awayTeamName: string;
}

const PITCH_TYPES: PitchType[] = ['Fastball', 'Curveball', 'Changeup', 'Slider', 'Other'];

function formatOrdinal(n: number) {
    return n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : `${n}th`;
}

export default function ScorerPanel({ gameId, homeTeamName, awayTeamName }: Props) {
    const [gs, setGs] = useState<GameState | null>(null);
    const [editingHome, setEditingHome] = useState(false);
    const [editingAway, setEditingAway] = useState(false);
    const [homeInput, setHomeInput] = useState(homeTeamName);
    const [awayInput, setAwayInput] = useState(awayTeamName);

    // Phase 2 state
    const [roster, setRoster] = useState<{ home: Player[]; away: Player[] }>({ home: [], away: [] });
    const [activeBatterId, setActiveBatterId] = useState<string | null>(null);
    const [activePitcherId, setActivePitcherId] = useState<string | null>(null);
    const [pitchType, setPitchType] = useState<PitchType | null>(null);

    // Phase 3: half-inning banner
    const [halfInningBanner, setHalfInningBanner] = useState<string | null>(null);
    const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track previous outs to detect the 3-out flip
    const prevOutsRef = useRef<number>(0);
    const prevInningRef = useRef<{ inning: number; isTop: boolean }>({ inning: 1, isTop: true });

    useEffect(() => {
        initGameState(gameId, homeTeamName, awayTeamName);
        const unsub = subscribeGameState(gameId, (state) => {
            const s = state ?? {
                ...DEFAULT_GAME_STATE,
                homeTeam: { ...DEFAULT_GAME_STATE.homeTeam, name: homeTeamName },
                awayTeam: { ...DEFAULT_GAME_STATE.awayTeam, name: awayTeamName },
            };

            // Detect half-inning flip: outs reset to 0 AND inning/side changed
            const prevOuts = prevOutsRef.current;
            const prevRef = prevInningRef.current;
            const sideChanged = s.inning !== prevRef.inning || s.isTopInning !== prevRef.isTop;
            if (prevOuts >= 2 && s.outs === 0 && sideChanged) {
                const halfLabel = s.isTopInning ? 'Top' : 'Bottom';
                const battingTeam = s.isTopInning ? s.awayTeam.name : s.homeTeam.name;
                const msg = `${halfLabel} ${formatOrdinal(s.inning)} — ${battingTeam} up to bat`;
                setHalfInningBanner(msg);
                if (bannerTimer.current) clearTimeout(bannerTimer.current);
                bannerTimer.current = setTimeout(() => setHalfInningBanner(null), 2800);
                // Auto-advance batter
                setActiveBatterId(null);
            }

            prevOutsRef.current = s.outs;
            prevInningRef.current = { inning: s.inning, isTop: s.isTopInning };
            setGs(s);
        });
        return () => { unsub(); if (bannerTimer.current) clearTimeout(bannerTimer.current); };
    }, [gameId]);

    useEffect(() => {
        const unsub = subscribeRoster(gameId, setRoster);
        return () => unsub();
    }, [gameId]);

    if (!gs) return <div className="text-white/30 text-sm text-center py-8">Loading scorer panel...</div>;

    // Derive batting / fielding roster
    const battingRoster = gs.isTopInning ? roster.away : roster.home;
    const fieldingRoster = gs.isTopInning ? roster.home : roster.away;
    const activeBatter = battingRoster.find(p => p.id === activeBatterId) ?? null;
    const activePitcher = fieldingRoster.find(p => p.id === activePitcherId) ?? null;

    // Batter stats from game state
    const bStat = activeBatterId ? (gs.batterStats?.[activeBatterId] ?? { ab: 0, hits: 0 }) : null;
    const batterStatLabel = bStat ? `${bStat.hits}-for-${bStat.ab}` : null;

    /** Apply a game state change AND log the play event. */
    const apply = async (partial: Partial<GameState>, result: string) => {
        await Promise.all([
            updateGameState(gameId, partial),
            addPlayEvent(gameId, {
                inning: gs.inning,
                isTopInning: gs.isTopInning,
                pitchType: pitchType ?? undefined,
                result,
                batterName: activeBatter?.name,
                pitcherName: activePitcher?.name,
                onFirst: gs.onFirst,
                onSecond: gs.onSecond,
                onThird: gs.onThird,
            }),
        ]);
        setPitchType(null);
    };

    const battingTeamName = gs.isTopInning ? gs.awayTeam.name : gs.homeTeam.name;
    const halfLabel = gs.isTopInning ? 'Top' : 'Bot';
    const btnBase = 'flex flex-col items-center justify-center rounded-2xl font-black text-sm transition-all active:scale-95 select-none touch-manipulation';

    return (
        <div className="space-y-4 relative">

            {/* ── Phase 3: Half-Inning Banner ── */}
            {halfInningBanner && (
                <div
                    className="absolute inset-x-0 top-0 z-50 rounded-2xl overflow-hidden"
                    style={{ animation: 'fadeSlideDown 0.3s ease' }}
                >
                    <div className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-center py-5 px-4 shadow-2xl border border-cyan-400/30">
                        <p className="text-[10px] font-black uppercase tracking-widest text-cyan-200/80 mb-1">Half Inning Over</p>
                        <p className="text-lg font-black">{halfInningBanner}</p>
                        <div className="flex justify-center gap-6 mt-2 text-sm font-black">
                            <span>{gs.awayTeam.name}: {gs.awayTeam.score}</span>
                            <span className="text-white/40">·</span>
                            <span>{gs.homeTeam.name}: {gs.homeTeam.score}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Phase 2: Batter / Pitcher selectors ── */}
            <div className="grid grid-cols-2 gap-2">
                {/* Batter picker */}
                <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 text-center">Batter</p>
                    {battingRoster.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                            {battingRoster.sort((a, b) => a.order - b.order).map(p => {
                                const ps = gs.batterStats?.[p.id];
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveBatterId(p.id === activeBatterId ? null : p.id)}
                                        className={`text-[10px] font-black px-2 py-1 rounded-lg border transition-all ${p.id === activeBatterId
                                            ? 'bg-cyan-500/30 border-cyan-400/50 text-cyan-300'
                                            : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                                            }`}
                                    >
                                        #{p.number} {p.name.split(' ')[0]}
                                        {ps && <span className="opacity-50 ml-1">{ps.hits}/{ps.ab}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[10px] text-white/20 text-center py-1">Add roster in Roster tab</p>
                    )}
                </div>

                {/* Pitcher picker */}
                <div>
                    <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 text-center">Pitcher</p>
                    {fieldingRoster.length > 0 ? (
                        <div className="flex flex-wrap gap-1 justify-center">
                            {fieldingRoster.filter(p => !p.position || p.position === 'P' || fieldingRoster.length <= 5).sort((a, b) => a.order - b.order).map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setActivePitcherId(p.id === activePitcherId ? null : p.id)}
                                    className={`text-[10px] font-black px-2 py-1 rounded-lg border transition-all ${p.id === activePitcherId
                                        ? 'bg-amber-500/30 border-amber-400/50 text-amber-300'
                                        : 'bg-white/5 border-white/10 text-white/50 hover:border-white/20'
                                        }`}
                                >
                                    #{p.number} {p.name.split(' ')[0]}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[10px] text-white/20 text-center py-1">Add roster in Roster tab</p>
                    )}
                </div>
            </div>

            {/* ── Phase 2: Pitch type ── */}
            <div>
                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1.5 text-center">Pitch Type</p>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                    {PITCH_TYPES.map(pt => (
                        <button
                            key={pt}
                            onClick={() => setPitchType(pitchType === pt ? null : pt)}
                            className={`flex-shrink-0 text-[10px] font-black px-2.5 py-1.5 rounded-lg border transition-all ${pitchType === pt
                                ? 'bg-violet-500/30 border-violet-400/50 text-violet-300'
                                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/70'
                                }`}
                        >
                            {pt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Batting Info card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Batting</p>
                        <p className="text-base font-black text-cyan-400">{battingTeamName}</p>
                        <p className="text-[10px] text-white/40">{halfLabel} {formatOrdinal(gs.inning)}</p>
                        {activeBatter && (
                            <p className="text-[10px] text-cyan-300/70 mt-0.5">
                                ⚾ {activeBatter.name} #{activeBatter.number}
                                {batterStatLabel && <span className="ml-1.5 text-white/40">({batterStatLabel})</span>}
                            </p>
                        )}
                    </div>
                    {activePitcher && (
                        <div className="text-right">
                            <p className="text-[10px] text-amber-300/70">⚡ {activePitcher.name.split(' ')[0]}</p>
                            <p className="text-[10px] font-black text-amber-400/90 mt-0.5">{gs.pitchCount ?? 0}P</p>
                        </div>
                    )}
                </div>
                {gs.lastPlay && <p className="text-[10px] text-amber-400/70 mt-1.5 truncate border-t border-white/5 pt-1.5">↳ {gs.lastPlay}</p>}
            </div>

            {/* Count Display */}
            <div className="grid grid-cols-3 gap-2">
                {[
                    { label: 'Balls', value: gs.balls, max: 4, color: 'bg-green-500' },
                    { label: 'Strikes', value: gs.strikes, max: 3, color: 'bg-amber-500' },
                    { label: 'Outs', value: gs.outs, max: 3, color: 'bg-red-500' },
                ].map(({ label, value, max, color }) => (
                    <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-2 text-center">
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{label}</p>
                        <p className="text-2xl font-black text-white">{value}</p>
                        <div className="flex gap-0.5 justify-center mt-1">
                            {Array.from({ length: max }).map((_, i) => (
                                <div key={i} className={`w-2 h-2 rounded-full ${i < value ? color : 'bg-white/10'}`} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Phase 3: Ball / K / ꓘ / Foul quick-count row ── */}
            <div className="grid grid-cols-4 gap-1.5">
                <button
                    onClick={() => { const p = applyBall(gs); apply(p, p.lastPlay ?? 'Ball'); }}
                    className={`${btnBase} py-5 bg-green-500/20 border border-green-500/30 text-green-400 hover:bg-green-500/30`}
                >
                    <span className="text-xl mb-0.5">⚪</span>
                    <span className="text-xs">Ball</span>
                </button>
                <button
                    onClick={() => { const p = applySwingingStrike(gs, activeBatterId); apply(p, p.lastPlay ?? 'Strike K'); }}
                    className={`${btnBase} py-5 bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30`}
                >
                    <span className="text-xl font-black mb-0.5">K</span>
                    <span className="text-[10px]">Swing</span>
                </button>
                <button
                    onClick={() => { const p = applyCalledStrike(gs, activeBatterId); apply(p, p.lastPlay ?? 'Strike ꓘ'); }}
                    className={`${btnBase} py-5 bg-orange-500/20 border border-orange-500/30 text-orange-300 hover:bg-orange-500/30`}
                >
                    <span className="text-xl font-black mb-0.5">ꓘ</span>
                    <span className="text-[10px]">Called</span>
                </button>
                <button
                    onClick={() => { const p = applyFoul(gs); apply(p, p.lastPlay ?? 'Foul'); }}
                    className={`${btnBase} py-5 bg-white/10 border border-white/15 text-white/70 hover:bg-white/20`}
                >
                    <span className="text-xl mb-0.5">〽️</span>
                    <span className="text-xs">Foul</span>
                </button>
            </div>

            {/* Hit Buttons */}
            <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 text-center">Hit</p>
                <div className="grid grid-cols-4 gap-2">
                    {([1, 2, 3, 4] as const).map((bases) => {
                        const labels = ['1B', '2B', '3B', 'HR'];
                        const colors = [
                            'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30',
                            'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30',
                            'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30',
                            'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30',
                        ];
                        return (
                            <button key={bases} onClick={() => { const p = applyHit(gs, bases, activeBatterId); apply(p, p.lastPlay ?? labels[bases - 1]); }} className={`${btnBase} py-5 px-1 border text-lg font-black ${colors[bases - 1]}`}>
                                {labels[bases - 1]}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Out / Walk / Score Row */}
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => { const p = applyOut(gs, 'Out', activeBatterId); apply(p, p.lastPlay ?? 'Out'); }} className={`${btnBase} py-4 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30`}>
                    Out
                </button>
                <button onClick={() => { const p = applyWalk(gs); apply(p, p.lastPlay ?? 'Walk'); }} className={`${btnBase} py-4 bg-teal-500/20 border border-teal-500/30 text-teal-400 hover:bg-teal-500/30`}>
                    BB
                </button>
                <button onClick={() => { const p = scoreRun(gs); apply(p, 'Run Scored'); }} className={`${btnBase} py-4 bg-purple-500/20 border border-purple-500/30 text-purple-400 hover:bg-purple-500/30`}>
                    🏠 Run
                </button>
            </div>

            {/* Base Diamond */}
            <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 text-center">Bases</p>
                <BaseDiamond
                    onFirst={gs.onFirst}
                    onSecond={gs.onSecond}
                    onThird={gs.onThird}
                    onToggle={(base) => {
                        if (base === 'first') updateGameState(gameId, { onFirst: !gs.onFirst });
                        if (base === 'second') updateGameState(gameId, { onSecond: !gs.onSecond });
                        if (base === 'third') updateGameState(gameId, { onThird: !gs.onThird });
                    }}
                />
            </div>

            {/* Score Manual Editors */}
            <div className="grid grid-cols-2 gap-2">
                {(['homeTeam', 'awayTeam'] as const).map((side) => (
                    <div key={side} className="bg-white/5 border border-white/10 rounded-2xl p-3">
                        {(side === 'homeTeam' ? editingHome : editingAway) ? (
                            <input
                                autoFocus
                                value={side === 'homeTeam' ? homeInput : awayInput}
                                onChange={e => (side === 'homeTeam' ? setHomeInput : setAwayInput)(e.target.value)}
                                onBlur={() => {
                                    updateGameState(gameId, { [side]: { ...gs[side], name: side === 'homeTeam' ? homeInput : awayInput } });
                                    side === 'homeTeam' ? setEditingHome(false) : setEditingAway(false);
                                }}
                                className="w-full bg-transparent text-xs font-black text-white text-center outline-none border-b border-cyan-400/50"
                            />
                        ) : (
                            <button onClick={() => side === 'homeTeam' ? setEditingHome(true) : setEditingAway(true)} className="w-full text-xs font-black text-white/60 text-center hover:text-white transition-colors truncate">
                                {gs[side].name} ✏️
                            </button>
                        )}
                        <div className="flex items-center justify-between mt-2">
                            <button onClick={() => updateGameState(gameId, { [side]: { ...gs[side], score: Math.max(0, gs[side].score - 1) } })} className="w-8 h-8 rounded-full bg-white/10 text-white font-black hover:bg-white/20 transition-colors">−</button>
                            <span className="text-3xl font-black text-white">{gs[side].score}</span>
                            <button onClick={() => updateGameState(gameId, { [side]: { ...gs[side], score: gs[side].score + 1 } })} className="w-8 h-8 rounded-full bg-white/10 text-white font-black hover:bg-white/20 transition-colors">+</button>
                        </div>
                        <p className="text-[10px] text-white/30 text-center mt-1">{gs[side].hits}H {gs[side].errors}E</p>
                    </div>
                ))}
            </div>

            {/* Inning controls */}
            <div className="flex gap-2">
                <button
                    onClick={() => updateGameState(gameId, { isTopInning: !gs.isTopInning, balls: 0, strikes: 0, outs: 0, pitchCount: 0, onFirst: false, onSecond: false, onThird: false, lastPlay: '' })}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                    ⇄ Switch Half
                </button>
                <button
                    onClick={() => updateGameState(gameId, { balls: 0, strikes: 0, lastPlay: 'At-bat reset' })}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-black text-white/50 hover:bg-white/10 hover:text-white transition-all"
                >
                    ↺ Reset Count
                </button>
            </div>
        </div>
    );
}

function BaseDiamond({ onFirst, onSecond, onThird, onToggle }: {
    onFirst: boolean; onSecond: boolean; onThird: boolean;
    onToggle: (base: 'first' | 'second' | 'third') => void;
}) {
    const active = 'bg-amber-400 border-amber-300 shadow-lg shadow-amber-500/40';
    const inactive = 'bg-white/10 border-white/20';
    const baseBtn = `w-10 h-10 rotate-45 border-2 rounded-sm transition-all cursor-pointer active:scale-90`;

    return (
        <div className="flex justify-center items-center h-28">
            <div className="relative w-28 h-28">
                <button onClick={() => onToggle('second')} className={`${baseBtn} ${onSecond ? active : inactive} absolute top-0 left-1/2 -translate-x-1/2`} />
                <button onClick={() => onToggle('third')} className={`${baseBtn} ${onThird ? active : inactive} absolute left-0 top-1/2 -translate-y-1/2`} />
                <button onClick={() => onToggle('first')} className={`${baseBtn} ${onFirst ? active : inactive} absolute right-0 top-1/2 -translate-y-1/2`} />
                <div className={`${baseBtn} bg-white/5 border-white/10 absolute bottom-0 left-1/2 -translate-x-1/2`} />
            </div>
        </div>
    );
}

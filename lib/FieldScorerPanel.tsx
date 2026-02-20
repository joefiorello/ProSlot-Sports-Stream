'use client';

import { useState, useEffect } from 'react';
import {
    GameState, DEFAULT_GAME_STATE,
    initGameState, updateGameState, subscribeGameState,
    applyBall, applyStrike, applyFoul, applyOut, applyHit, applyWalk,
} from '@/lib/gameScore';
import { subscribeRoster } from '@/lib/roster';
import { addPlayEvent, undoLastPlay } from '@/lib/playByPlay';
import type { Player, PitchType } from '@/types';

// ─── Palette ─────────────────────────────────────────────────────────────────
const C = {
    bg: '#0d1117',
    surface: '#161b22',
    border: 'rgba(255,255,255,0.08)',
    fieldGreen: '#2a5c2c',
    fieldLight: '#3a7a3d',
    dirt: '#c4a46b',
    dirtDark: '#a07840',
    runnerOn: '#f0c040',
    runnerOff: 'rgba(255,255,255,0.85)',
    text: '#e6edf3',
    textMuted: 'rgba(255,255,255,0.4)',
};

const PITCH_TYPES: { key: PitchType; label: string }[] = [
    { key: 'Fastball', label: 'FB' },
    { key: 'Curveball', label: 'CB' },
    { key: 'Changeup', label: 'CH' },
    { key: 'Slider', label: 'SL' },
    { key: 'Other', label: 'OT' },
];

const HIT_OPTIONS = [
    { label: '1B', sub: 'Single', bases: 1 as const, color: '#238636' },
    { label: '2B', sub: 'Double', color: '#1f6feb', bases: 2 as const },
    { label: '3B', sub: 'Triple', color: '#6e40c9', bases: 3 as const },
    { label: 'HR', sub: 'Home Run', color: '#d93126', bases: 4 as const },
] as const;

const OUT_OPTIONS = [
    { label: 'Out', sub: 'Groundout/Flyout', result: 'Out', type: 'out' as const },
    { label: 'K', sub: 'Strikeout', result: 'Strikeout', type: 'out' as const },
    { label: 'BB', sub: 'Walk', result: 'Walk', type: 'walk' as const },
    { label: 'HBP', sub: 'Hit by Pitch', result: 'Walk', type: 'walk' as const },
    { label: 'E', sub: 'Error', result: 'Error — Runner Safe', type: 'hit1' as const },
    { label: 'FC', sub: "Fielder's Choice", result: "Fielder's Choice", type: 'hit1' as const },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { gameId: string; homeTeamName: string; awayTeamName: string; }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FieldScorerPanel({ gameId, homeTeamName, awayTeamName }: Props) {
    const [gs, setGs] = useState<GameState | null>(null);
    const [roster, setRoster] = useState<{ home: Player[]; away: Player[] }>({ home: [], away: [] });
    const [activeBatterId, setActiveBatterId] = useState<string | null>(null);
    const [activePitcherId, setActivePitcherId] = useState<string | null>(null);
    const [pitchType, setPitchType] = useState<PitchType | null>(null);
    const [showInPlay, setShowInPlay] = useState(false);
    const [showBatterPicker, setShowBatterPicker] = useState(false);
    const [showPitcherPicker, setShowPitcherPicker] = useState(false);
    const [showScoreEdit, setShowScoreEdit] = useState(false);
    const [flashResult, setFlashResult] = useState<string | null>(null);

    useEffect(() => {
        initGameState(gameId, homeTeamName, awayTeamName);
        const unsub = subscribeGameState(gameId, (s) =>
            setGs(s ?? { ...DEFAULT_GAME_STATE, homeTeam: { ...DEFAULT_GAME_STATE.homeTeam, name: homeTeamName }, awayTeam: { ...DEFAULT_GAME_STATE.awayTeam, name: awayTeamName } })
        );
        return () => unsub();
    }, [gameId]);

    useEffect(() => {
        const unsub = subscribeRoster(gameId, setRoster);
        return () => unsub();
    }, [gameId]);

    if (!gs) return (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.runnerOn, animation: 'pulse 1s infinite' }} />
        </div>
    );

    const battingRoster = gs.isTopInning ? roster.away : roster.home;
    const fieldingRoster = gs.isTopInning ? roster.home : roster.away;
    const activeBatter = battingRoster.find(p => p.id === activeBatterId) ?? null;
    const activePitcher = fieldingRoster.find(p => p.id === activePitcherId) ?? null;

    const applyAndLog = async (partial: Partial<GameState>, result: string) => {
        const prevGameState = { ...gs } as Record<string, unknown>;
        setFlashResult(result.split(' — ')[0]);
        setTimeout(() => setFlashResult(null), 1200);
        setPitchType(null);

        await Promise.all([
            updateGameState(gameId, partial),
            addPlayEvent(gameId, {
                inning: gs.inning, isTopInning: gs.isTopInning,
                pitchType: pitchType ?? undefined, result,
                batterName: activeBatter?.name, pitcherName: activePitcher?.name,
                onFirst: gs.onFirst, onSecond: gs.onSecond, onThird: gs.onThird,
                prevGameState,
            }),
        ]);
    };

    const handleUndo = async () => {
        const prev = await undoLastPlay(gameId);
        if (prev) await updateGameState(gameId, prev as Partial<GameState>);
    };

    const handleInPlay = (bases: 1 | 2 | 3 | 4 | null, result: string, type: 'out' | 'walk' | 'hit1') => {
        if (!gs) return;
        let partial: Partial<GameState>;
        if (bases !== null) {
            partial = applyHit(gs, bases);
        } else if (type === 'walk') {
            partial = applyWalk(gs);
        } else if (type === 'out') {
            partial = applyOut(gs, result);
        } else {
            partial = applyHit(gs, 1); // Error / FC — batter reaches 1st
        }
        applyAndLog(partial, partial.lastPlay ?? result);
        setShowInPlay(false);
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* ── Zone 1: Scoreboard ──────────────────────────────────────── */}
            <Scoreboard
                gs={gs} gameId={gameId}
                homeTeamName={homeTeamName} awayTeamName={awayTeamName}
                onUndo={handleUndo}
                onEditScore={() => setShowScoreEdit(true)}
            />

            {/* ── Zone 2: Diamond ─────────────────────────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4px 12px', gap: 4, minHeight: 0 }}>

                {/* Pitcher badge */}
                <PlayerBadge
                    player={activePitcher}
                    placeholder="Set Pitcher"
                    accentColor="#f59e0b"
                    role="P"
                    onClick={() => setShowPitcherPicker(true)}
                />

                {/* SVG Diamond */}
                <div style={{ width: '100%', maxWidth: 300, flex: '1 1 auto', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BaseballDiamond
                        onFirst={gs.onFirst} onSecond={gs.onSecond} onThird={gs.onThird}
                        onToggle={(base) => {
                            if (base === 'first') updateGameState(gameId, { onFirst: !gs.onFirst });
                            if (base === 'second') updateGameState(gameId, { onSecond: !gs.onSecond });
                            if (base === 'third') updateGameState(gameId, { onThird: !gs.onThird });
                        }}
                    />
                </div>

                {/* Flash result */}
                {flashResult && (
                    <div style={{
                        position: 'absolute',
                        top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
                        fontSize: 28, fontWeight: 900, color: C.runnerOn,
                        textShadow: '0 0 20px rgba(240,192,64,0.8)',
                        pointerEvents: 'none', zIndex: 20,
                        animation: 'fadeOut 1.2s forwards',
                    }}>
                        {flashResult}
                    </div>
                )}

                {/* Batter badge */}
                <PlayerBadge
                    player={activeBatter}
                    placeholder="Set Batter"
                    accentColor="#3b82f6"
                    role="AB"
                    onClick={() => setShowBatterPicker(true)}
                />

                {/* Pitch type row */}
                <div style={{ display: 'flex', gap: 6, paddingTop: 2 }}>
                    <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, alignSelf: 'center', letterSpacing: 1 }}>PITCH</span>
                    {PITCH_TYPES.map(pt => (
                        <button key={pt.key} onClick={() => setPitchType(pitchType === pt.key ? null : pt.key)} style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            border: `1px solid ${pitchType === pt.key ? '#7c3aed' : C.border}`,
                            background: pitchType === pt.key ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)',
                            color: pitchType === pt.key ? '#c4b5fd' : C.textMuted,
                            transition: 'all 0.15s',
                        }}>
                            {pt.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Zone 3: Action Bar ────────────────────────────────────────── */}
            <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '10px 12px 16px', flexShrink: 0 }}>
                {/* Top pitch row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <ActionBtn label="BALL" color="#1f6feb" bg="rgba(31,111,235,0.15)" border="rgba(31,111,235,0.4)"
                        onClick={() => { const p = applyBall(gs); applyAndLog(p, p.lastPlay ?? 'Ball'); }} />
                    <ActionBtn label="STRIKE" color="#f59e0b" bg="rgba(245,158,11,0.15)" border="rgba(245,158,11,0.4)"
                        onClick={() => { const p = applyStrike(gs); applyAndLog(p, p.lastPlay ?? 'Strike'); }} />
                    <ActionBtn label="FOUL" color="#8b949e" bg="rgba(139,148,158,0.1)" border="rgba(139,148,158,0.3)"
                        onClick={() => { const p = applyFoul(gs); applyAndLog(p, p.lastPlay ?? 'Foul Ball'); }} />
                </div>
                {/* Ball in Play — big green button */}
                <button onClick={() => setShowInPlay(true)} style={{
                    width: '100%', padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 900,
                    background: 'rgba(35,134,54,0.25)', border: '1px solid rgba(35,134,54,0.5)',
                    color: '#3fb950', cursor: 'pointer', letterSpacing: 0.5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    <span style={{ fontSize: 18 }}>⚾</span> BALL IN PLAY
                </button>
            </div>

            {/* ── Sheets ───────────────────────────────────────────────────── */}
            {showInPlay && (
                <BottomSheet title="What happened?" onClose={() => setShowInPlay(false)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                        {HIT_OPTIONS.map(h => (
                            <button key={h.label} onClick={() => handleInPlay(h.bases, h.sub, 'hit1')} style={{
                                padding: '16px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                                background: `${h.color}22`, border: `1px solid ${h.color}66`, color: h.color,
                            }}>
                                <div style={{ fontSize: 24, fontWeight: 900 }}>{h.label}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{h.sub}</div>
                            </button>
                        ))}
                    </div>
                    <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {OUT_OPTIONS.map(o => (
                            <button key={o.label} onClick={() => handleInPlay(null, o.result, o.type)} style={{
                                padding: '12px 6px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                                background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`,
                                color: C.text,
                            }}>
                                <div style={{ fontSize: 18, fontWeight: 900 }}>{o.label}</div>
                                <div style={{ fontSize: 10, fontWeight: 600, color: C.textMuted }}>{o.sub}</div>
                            </button>
                        ))}
                    </div>
                </BottomSheet>
            )}

            {showBatterPicker && (
                <PlayerPickerSheet
                    title="Select Batter"
                    players={battingRoster}
                    activeId={activeBatterId}
                    accentColor="#3b82f6"
                    onSelect={(id) => { setActiveBatterId(id); setShowBatterPicker(false); }}
                    onClose={() => setShowBatterPicker(false)}
                />
            )}

            {showPitcherPicker && (
                <PlayerPickerSheet
                    title="Select Pitcher"
                    players={fieldingRoster}
                    activeId={activePitcherId}
                    accentColor="#f59e0b"
                    onSelect={(id) => { setActivePitcherId(id); setShowPitcherPicker(false); }}
                    onClose={() => setShowPitcherPicker(false)}
                />
            )}

            {showScoreEdit && gs && (
                <ScoreEditSheet
                    gs={gs} gameId={gameId}
                    homeTeamName={homeTeamName} awayTeamName={awayTeamName}
                    onClose={() => setShowScoreEdit(false)}
                />
            )}

            {/* Keyframes */}
            <style>{`
                @keyframes fadeOut { 0%{opacity:1;transform:translate(-50%,-50%) scale(1.2)} 80%{opacity:0.8} 100%{opacity:0;transform:translate(-50%,-60%) scale(0.9)} }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
            `}</style>
        </div>
    );
}

// ─── Scoreboard ───────────────────────────────────────────────────────────────
function Scoreboard({ gs, gameId, homeTeamName, awayTeamName, onUndo, onEditScore }: {
    gs: GameState; gameId: string; homeTeamName: string; awayTeamName: string;
    onUndo: () => void; onEditScore: () => void;
}) {
    const inning = `${gs.isTopInning ? '▲' : '▼'}${gs.inning}`;
    const teamStyle = (score: number): React.CSSProperties => ({
        fontSize: 32, fontWeight: 900, color: '#e6edf3', lineHeight: 1, cursor: 'pointer',
    });

    return (
        <div style={{ background: '#0d1823', borderBottom: `1px solid ${C.border}`, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Away */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Away</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gs.awayTeam.name}</div>
                <button onClick={onEditScore} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...teamStyle(gs.awayTeam.score) }}>{gs.awayTeam.score}</button>
            </div>

            {/* Center column */}
            <div style={{ textAlign: 'center', minWidth: 70 }}>
                {/* Inning */}
                <div style={{ fontSize: 20, fontWeight: 900, color: C.runnerOn, marginBottom: 4, letterSpacing: -0.5 }}>{inning}</div>
                {/* Outs */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 4 }}>
                    {[0, 1, 2].map(i => (
                        <div key={i} style={{ width: 9, height: 9, borderRadius: '50%', background: i < gs.outs ? C.runnerOn : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
                    ))}
                </div>
                {/* Count */}
                <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1 }}>
                    <span style={{ color: '#3b82f6' }}>{gs.balls}</span>
                    <span style={{ color: C.textMuted, margin: '0 2px' }}>-</span>
                    <span style={{ color: '#f59e0b' }}>{gs.strikes}</span>
                </div>
            </div>

            {/* Home */}
            <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 9, fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Home</div>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gs.homeTeam.name}</div>
                <button onClick={onEditScore} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...teamStyle(gs.homeTeam.score) }}>{gs.homeTeam.score}</button>
            </div>

            {/* Undo */}
            <button onClick={onUndo} style={{
                padding: '8px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${C.border}`, color: C.textMuted, fontSize: 16, cursor: 'pointer', flexShrink: 0,
            }} title="Undo last play">
                ↩
            </button>
        </div>
    );
}

// ─── Baseball Diamond SVG ─────────────────────────────────────────────────────
function BaseballDiamond({ onFirst, onSecond, onThird, onToggle }: {
    onFirst: boolean; onSecond: boolean; onThird: boolean;
    onToggle: (b: 'first' | 'second' | 'third') => void;
}) {
    // Layout (viewBox 260 230):
    // 2B: (130, 32), 1B: (218, 115), 3B: (42, 115), Home: (130, 198)
    const Base = ({ cx, cy, on, onClick }: { cx: number; cy: number; on: boolean; onClick: () => void }) => (
        <g onClick={onClick} style={{ cursor: 'pointer' }}>
            {on && <rect x={cx - 16} y={cy - 16} width={32} height={32} transform={`rotate(45 ${cx} ${cy})`} fill="rgba(240,192,64,0.35)" rx="2" style={{ filter: 'blur(5px)' }} />}
            <rect
                x={cx - 11} y={cy - 11} width={22} height={22}
                transform={`rotate(45 ${cx} ${cy})`}
                fill={on ? C.runnerOn : C.runnerOff}
                rx="1.5"
                style={{ filter: on ? 'url(#baseGlow)' : 'none', transition: 'fill 0.2s' }}
            />
        </g>
    );

    return (
        <svg viewBox="0 0 260 230" style={{ width: '100%', maxWidth: 300, height: 'auto', display: 'block' }}>
            <defs>
                <filter id="baseGlow" x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
                <radialGradient id="fieldGrad" cx="50%" cy="80%" r="60%">
                    <stop offset="0%" stopColor="#3a7a3d" />
                    <stop offset="100%" stopColor="#2a5a2c" />
                </radialGradient>
            </defs>

            {/* Outfield */}
            <path d="M 20 205 Q 130 5 240 205 Z" fill="url(#fieldGrad)" />

            {/* Infield dirt diamond */}
            <polygon points="130,32 218,115 130,198 42,115" fill={C.dirt} />

            {/* Infield grass circle */}
            <circle cx="130" cy="115" r="54" fill={C.fieldLight} />

            {/* Foul lines (dashed) */}
            <line x1="42" y1="115" x2="14" y2="200" stroke="#a09060" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />
            <line x1="218" y1="115" x2="246" y2="200" stroke="#a09060" strokeWidth="1.5" strokeDasharray="5,4" opacity="0.5" />

            {/* Pitcher's mound */}
            <circle cx="130" cy="107" r="10" fill={C.dirtDark} />
            <circle cx="130" cy="107" r="4" fill={C.dirt} />

            {/* Bases (interactive) */}
            <Base cx={130} cy={32} on={onSecond} onClick={() => onToggle('second')} />
            <Base cx={218} cy={115} on={onFirst} onClick={() => onToggle('first')} />
            <Base cx={42} cy={115} on={onThird} onClick={() => onToggle('third')} />

            {/* Home plate */}
            <polygon points="130,187 145,195 145,204 130,210 115,204 115,195" fill="rgba(255,255,255,0.92)" />
        </svg>
    );
}

// ─── Player Badge ─────────────────────────────────────────────────────────────
function PlayerBadge({ player, placeholder, accentColor, role, onClick }: {
    player: Player | null; placeholder: string; accentColor: string; role: string; onClick: () => void;
}) {
    return (
        <button onClick={onClick} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
            background: player ? `${accentColor}15` : 'rgba(255,255,255,0.03)',
            border: `1px solid ${player ? `${accentColor}40` : C.border}`,
            borderRadius: 24, cursor: 'pointer', transition: 'all 0.15s',
        }}>
            <span style={{ fontSize: 9, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: 1.5 }}>{role}</span>
            {player ? (
                <>
                    <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{player.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: accentColor }}>#{player.number}</span>
                </>
            ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{placeholder}</span>
            )}
        </button>
    );
}

// ─── Action Button ────────────────────────────────────────────────────────────
function ActionBtn({ label, color, bg, border, onClick }: { label: string; color: string; bg: string; border: string; onClick: () => void; }) {
    return (
        <button onClick={onClick} style={{
            padding: '14px 8px', borderRadius: 12, fontWeight: 900, fontSize: 15,
            background: bg, border: `1px solid ${border}`, color, cursor: 'pointer',
            letterSpacing: 0.5, transition: 'all 0.1s', WebkitTapHighlightColor: 'transparent',
        }}>
            {label}
        </button>
    );
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function BottomSheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void; }) {
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)' }} onClick={onClose} />
            <div style={{ position: 'relative', background: '#161b22', borderTop: `1px solid ${C.border}`, borderRadius: '20px 20px 0 0', padding: '0 16px 32px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 4 }}>
                    <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1.5, textAlign: 'center', marginBottom: 14 }}>{title}</p>
                {children}
            </div>
        </div>
    );
}

// ─── Player Picker Sheet ──────────────────────────────────────────────────────
function PlayerPickerSheet({ title, players, activeId, accentColor, onSelect, onClose }: {
    title: string; players: Player[]; activeId: string | null; accentColor: string;
    onSelect: (id: string | null) => void; onClose: () => void;
}) {
    return (
        <BottomSheet title={title} onClose={onClose}>
            {players.length === 0 ? (
                <p style={{ textAlign: 'center', color: C.textMuted, fontSize: 13, padding: '20px 0' }}>
                    No players yet — add them in the Roster drawer
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                    {players.sort((a, b) => a.order - b.order).map(p => (
                        <button key={p.id} onClick={() => onSelect(p.id === activeId ? null : p.id)} style={{
                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 12,
                            background: p.id === activeId ? `${accentColor}20` : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${p.id === activeId ? `${accentColor}50` : C.border}`,
                            cursor: 'pointer',
                        }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: accentColor, minWidth: 28 }}>#{p.number}</span>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.text, flex: 1, textAlign: 'left' }}>{p.name}</span>
                            {p.position && <span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>{p.position}</span>}
                            {p.id === activeId && <span style={{ fontSize: 12, color: accentColor }}>✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </BottomSheet>
    );
}

// ─── Score Edit Sheet ─────────────────────────────────────────────────────────
function ScoreEditSheet({ gs, gameId, homeTeamName, awayTeamName, onClose }: {
    gs: GameState; gameId: string; homeTeamName: string; awayTeamName: string; onClose: () => void;
}) {
    return (
        <BottomSheet title="Edit Game State" onClose={onClose}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {(['awayTeam', 'homeTeam'] as const).map(side => (
                    <div key={side} style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, textAlign: 'center' }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{side === 'awayTeam' ? awayTeamName : homeTeamName}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                            <button onClick={() => updateGameState(gameId, { [side]: { ...gs[side], score: Math.max(0, gs[side].score - 1) } })} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: `1px solid ${C.border}`, color: '#e6edf3', fontSize: 20, cursor: 'pointer', fontWeight: 900 }}>−</button>
                            <span style={{ fontSize: 36, fontWeight: 900, color: '#e6edf3' }}>{gs[side].score}</span>
                            <button onClick={() => updateGameState(gameId, { [side]: { ...gs[side], score: gs[side].score + 1 } })} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: `1px solid ${C.border}`, color: '#e6edf3', fontSize: 20, cursor: 'pointer', fontWeight: 900 }}>+</button>
                        </div>
                        <p style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{gs[side].hits}H · {gs[side].errors}E</p>
                    </div>
                ))}
            </div>
            {/* Inning / half controls */}
            <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { updateGameState(gameId, { isTopInning: !gs.isTopInning, balls: 0, strikes: 0 }); onClose(); }} style={{ flex: 1, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: '#e6edf3', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>⇄ Switch Half</button>
                <button onClick={() => { updateGameState(gameId, { balls: 0, strikes: 0, lastPlay: '' }); onClose(); }} style={{ flex: 1, padding: 12, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.border}`, color: '#e6edf3', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>↺ Reset Count</button>
            </div>
        </BottomSheet>
    );
}

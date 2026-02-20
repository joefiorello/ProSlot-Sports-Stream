'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    LiveKitRoom,
    ParticipantTile,
    RoomAudioRenderer,
    useTracks,
    useParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Radio, Users, ChevronLeft, Scissors, Volume2, VolumeX } from 'lucide-react';
import { getGame, getGameByCode, ORG_ID } from '@/lib/db';
import { fetchToken, endSession, LIVEKIT_URL, requestClip } from '@/lib/livekit';
import ScoreboardOverlay from '@/lib/ScoreboardOverlay';
import BoxScore from '@/lib/BoxScore';
import PlayLog from '@/lib/PlayLog';
import type { Game } from '@/types';

const ANGLE_LABELS: Record<string, string> = {
    main: 'Main', plate: 'Home Plate', firstbase: '1st Base',
    dugout: 'Dugout', outfield: 'Outfield', custom: 'Custom',
};

// ─── Draggable / resizable floating PiP window ─────────────────────────────────

interface PipState { x: number; y: number; width: number; height: number; }

function FloatingCamera({ trackRef, label, initial, containerRef }: {
    trackRef: Parameters<typeof ParticipantTile>[0]['trackRef'];
    label: string;
    initial: PipState;
    containerRef: React.RefObject<HTMLDivElement>;
}) {
    const [pos, setPos] = useState({ x: initial.x, y: initial.y });
    const [size, setSize] = useState({ w: initial.width, h: initial.height });
    const [visible, setVisible] = useState(true);
    const [collapsed, setCollapsed] = useState(false);
    const dragging = useRef(false);
    const resizing = useRef(false);
    const startData = useRef({ mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 });

    const onDragStart = (e: React.PointerEvent) => {
        e.preventDefault();
        dragging.current = true;
        startData.current = { mouseX: e.clientX, mouseY: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h };
        const onMove = (ev: PointerEvent) => {
            if (!dragging.current) return;
            const container = containerRef.current;
            if (!container) return;
            const { width: cw, height: ch } = container.getBoundingClientRect();
            setPos({
                x: Math.max(0, Math.min(cw - size.w, startData.current.x + ev.clientX - startData.current.mouseX)),
                y: Math.max(0, Math.min(ch - 36, startData.current.y + ev.clientY - startData.current.mouseY)),
            });
        };
        const onUp = () => {
            dragging.current = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    const onResizeStart = (e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        resizing.current = true;
        startData.current = { mouseX: e.clientX, mouseY: e.clientY, x: pos.x, y: pos.y, w: size.w, h: size.h };
        const onMove = (ev: PointerEvent) => {
            if (!resizing.current) return;
            setSize({
                w: Math.max(160, startData.current.w + ev.clientX - startData.current.mouseX),
                h: Math.max(120, startData.current.h + ev.clientY - startData.current.mouseY),
            });
        };
        const onUp = () => {
            resizing.current = false;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    };

    if (!visible) return null;

    return (
        <div
            className="absolute z-30 rounded-xl overflow-hidden border border-white/25 shadow-2xl shadow-black/70 flex flex-col select-none"
            style={{ left: pos.x, top: pos.y, width: size.w, height: collapsed ? 36 : size.h }}
        >
            {/* Drag handle header */}
            <div
                onPointerDown={onDragStart}
                className="flex items-center justify-between px-2.5 py-1 bg-black/90 backdrop-blur-sm cursor-grab active:cursor-grabbing flex-shrink-0 border-b border-white/10"
            >
                <div className="flex items-center gap-1.5">
                    {/* macOS-style traffic lights */}
                    <button onClick={() => setVisible(false)} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex-shrink-0" title="Close" />
                    <button onClick={() => setCollapsed(c => !c)} className="w-3 h-3 rounded-full bg-amber-400 hover:bg-amber-300 transition-colors flex-shrink-0" title={collapsed ? 'Expand' : 'Collapse'} />
                </div>
                <span className="text-[9px] font-black text-white/60 uppercase tracking-widest truncate mx-2 flex-1 text-center">{label}</span>
                <div className="w-6 flex-shrink-0 flex items-center justify-end">
                    <svg width="10" height="6" viewBox="0 0 10 6" className="text-white/30">
                        <line x1="0" y1="3" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="7" y1="0" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="7" y1="6" x2="10" y2="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
            </div>

            {/* Video content */}
            {!collapsed && (
                <div className="flex-1 bg-black relative">
                    <ParticipantTile trackRef={trackRef} className="w-full h-full" />
                </div>
            )}

            {/* Bottom-right resize grip */}
            {!collapsed && (
                <div
                    onPointerDown={onResizeStart}
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-40 flex items-end justify-end p-1"
                >
                    <svg width="12" height="12" viewBox="0 0 10 10" className="text-white/50">
                        <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="10" y1="4" x2="4" y2="10" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="10" y1="8" x2="8" y2="10" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
            )}
        </div>
    );
}

// ─── Main stream viewer ─────────────────────────────────────────────────────────

function StreamViewer({ game, onClip }: { game: Game; onClip: (s: number, e: number) => void }) {
    const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
    const participants = useParticipants();
    const [primaryTrack, setPrimaryTrack] = useState(0);
    const [muted, setMuted] = useState(false);
    const [clipStart, setClipStart] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [pipMode, setPipMode] = useState(false);
    const [statsOpen, setStatsOpen] = useState(false);
    const [statsTab, setStatsTab] = useState<'boxscore' | 'playlog'>('boxscore');
    const intervalRef = useRef<ReturnType<typeof setInterval>>();
    const containerRef = useRef<HTMLDivElement>(null!);

    useEffect(() => {
        intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(intervalRef.current);
    }, []);

    // Auto-enable PiP when a second camera connects
    useEffect(() => {
        if (tracks.length >= 2) setPipMode(true);
    }, [tracks.length]);

    const selectedTrack = tracks[primaryTrack] ?? tracks[0];
    const secondaryTracks = pipMode ? tracks.filter((_, i) => i !== primaryTrack) : [];
    const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    const getPipInitial = (i: number): PipState => {
        const cw = containerRef.current?.clientWidth ?? 400;
        const ch = containerRef.current?.clientHeight ?? 300;
        const w = Math.min(280, cw * 0.35);
        const h = Math.round(w * 9 / 16);
        return { x: cw - w - 12 - i * 8, y: ch - h - 52 - i * 8, width: w, height: h };
    };

    return (
        <div className="flex flex-col h-screen bg-[#0a0f1a]">
            <div ref={containerRef} className="relative flex-1 bg-black overflow-hidden">
                {/* Primary camera */}
                {selectedTrack ? (
                    <div className="absolute inset-0">
                        <ParticipantTile trackRef={selectedTrack} className="w-full h-full" />
                    </div>
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <Radio className="w-12 h-12 text-white/10 mx-auto mb-3 animate-pulse" />
                            <p className="text-white/30 text-sm">Waiting for stream...</p>
                        </div>
                    </div>
                )}

                {/* Floating PiP windows */}
                {secondaryTracks.map((track, i) => {
                    const meta = track.participant?.metadata ? JSON.parse(track.participant.metadata) : {};
                    const label = ANGLE_LABELS[meta.angle] || track.participant?.name || `Camera ${i + 2}`;
                    return (
                        <FloatingCamera
                            key={track.participant?.sid ?? i}
                            trackRef={track}
                            label={label}
                            initial={getPipInitial(i)}
                            containerRef={containerRef}
                        />
                    );
                })}

                {/* Scoreboard Overlay */}
                <ScoreboardOverlay gameId={game.id} homeTeamName={game.homeTeam} awayTeamName={game.awayTeam} />

                {/* Top-left: LIVE + timer */}
                <div className="absolute top-4 left-4 flex items-center gap-3 z-10">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-black text-white">LIVE</span>
                    </div>
                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-xs font-mono text-white">{fmt(elapsed)}</span>
                    </div>
                </div>

                {/* Top-right: PiP toggle + viewer count + mute */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                    {tracks.length >= 2 && (
                        <button
                            onClick={() => setPipMode(p => !p)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${pipMode ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-black/60 text-white/60 hover:bg-black/80'}`}
                            title={pipMode ? 'Switch to tab mode' : 'Enable PiP overlay'}
                        >
                            ⧉ PiP
                        </button>
                    )}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <Users className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-xs font-bold text-white">{participants.length}</span>
                    </div>
                    <button onClick={() => setMuted(m => !m)} className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors">
                        {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="px-4 py-3 border-t border-white/5 bg-[#111827]">
                {tracks.length > 1 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1 items-center">
                        {pipMode && <span className="text-[10px] text-white/30 font-black uppercase tracking-widest flex-shrink-0">Primary:</span>}
                        {tracks.map((track, i) => {
                            const meta = track.participant?.metadata ? JSON.parse(track.participant.metadata) : {};
                            const label = ANGLE_LABELS[meta.angle] || track.participant?.name || `Camera ${i + 1}`;
                            return (
                                <button key={i} onClick={() => setPrimaryTrack(i)} className={`angle-chip flex-shrink-0 ${i === primaryTrack ? 'active' : 'inactive'}`}>{label}</button>
                            );
                        })}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="text-xs text-white/30">
                        {tracks.length} camera{tracks.length !== 1 && 's'} connected
                        {tracks.length >= 2 && pipMode && <span className="text-cyan-400/60"> · PiP on</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Stats button */}
                        <button
                            onClick={() => setStatsOpen(o => !o)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${statsOpen ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-white/10 hover:bg-white/20 text-white/70'}`}
                        >
                            📊 Stats
                        </button>
                        {clipStart !== null ? (
                            <>
                                <span className="text-xs text-amber-400 font-bold animate-pulse">● {fmt(elapsed - clipStart)}</span>
                                <button onClick={() => { onClip(clipStart, elapsed); setClipStart(null); }} className="px-4 py-1.5 bg-amber-500 text-black text-xs font-black rounded-lg">Save Clip</button>
                                <button onClick={() => setClipStart(null)} className="px-3 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg">Cancel</button>
                            </>
                        ) : (
                            <button onClick={() => setClipStart(elapsed)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors">
                                <Scissors className="w-3.5 h-3.5" /> Clip
                            </button>
                        )}
                    </div>
                </div>
            </div>
            <RoomAudioRenderer muted={muted} />

            {/* Stats slide-up sheet */}
            <div
                className="fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ease-out"
                style={{ transform: statsOpen ? 'translateY(0)' : 'translateY(100%)' }}
            >
                {/* Backdrop tap to close */}
                {statsOpen && (
                    <div
                        className="fixed inset-0 z-[-1]"
                        onClick={() => setStatsOpen(false)}
                    />
                )}
                <div className="bg-[#0f1623]/97 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl" style={{ maxHeight: '70vh' }}>
                    {/* Sheet handle */}
                    <div className="flex justify-center pt-3 pb-1">
                        <button onClick={() => setStatsOpen(false)} className="w-10 h-1 rounded-full bg-white/20" />
                    </div>
                    {/* Sub-tabs */}
                    <div className="flex border-b border-white/10 mx-4">
                        {([
                            { id: 'boxscore' as const, label: '📊 Box Score' },
                            { id: 'playlog' as const, label: '📋 Play Log' },
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setStatsTab(tab.id)}
                                className={`flex-1 py-2.5 text-xs font-black transition-colors ${statsTab === tab.id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-white/30'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="overflow-y-auto" style={{ maxHeight: 'calc(70vh - 100px)' }}>
                        {statsTab === 'boxscore' && (
                            <div className="p-4">
                                <BoxScore
                                    gameId={game.id}
                                    homeTeamName={game.homeTeam}
                                    awayTeamName={game.awayTeam}
                                />
                            </div>
                        )}
                        {statsTab === 'playlog' && (
                            <PlayLog gameId={game.id} />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function WatchInner() {
    const searchParams = useSearchParams();
    const gameId = searchParams.get('gameId') ?? '';
    const code = searchParams.get('code') ?? '';
    const [game, setGame] = useState<Game | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [clipToast, setClipToast] = useState<string | null>(null);

    useEffect(() => {
        if (!gameId && !code) { setLoading(false); return; }
        async function init() {
            let g = null;
            if (code) {
                g = await getGameByCode(ORG_ID, code);
            } else if (gameId) {
                g = await getGame(ORG_ID, gameId);
            }
            if (!g) { setLoading(false); return; }
            setGame(g);
            const { token: t, sessionId: sid } = await fetchToken({ roomName: g.roomName, participantName: `viewer-${Date.now()}`, role: 'viewer' });
            setToken(t);
            setSessionId(sid);
            setLoading(false);
        }
        init();
    }, [gameId, code]);

    // End the viewer session when leaving the page
    useEffect(() => {
        if (!sessionId) return;
        const handleUnload = () => endSession(sessionId);
        window.addEventListener('beforeunload', handleUnload);
        return () => {
            window.removeEventListener('beforeunload', handleUnload);
            endSession(sessionId);
        };
    }, [sessionId]);

    const handleClip = async (start: number, end: number) => {
        if (!game) return;
        try {
            await requestClip({ gameId: game.id, title: `Clip at ${new Date().toLocaleTimeString()}`, startTime: start, endTime: end, orgId: ORG_ID });
            setClipToast('Clip saved! Processing...');
        } catch { setClipToast('Failed to save clip.'); }
        setTimeout(() => setClipToast(null), 3000);
    };

    if (loading) return (
        <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
            <div className="text-center"><Radio className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-pulse" /><p className="text-white/40 text-sm">Connecting...</p></div>
        </div>
    );

    if (!game || !token) return (
        <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
            <div className="glass-card p-10 text-center"><p className="text-white/40 mb-4">Game not found.</p><Link href="/dashboard" className="text-cyan-400 text-sm font-bold">← Dashboard</Link></div>
        </div>
    );

    return (
        <div className="relative">
            <Link href="/dashboard" className="fixed top-4 left-4 z-50 flex items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm text-white/70 hover:text-white text-xs font-bold rounded-lg transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> {game.homeTeam} vs {game.awayTeam}
            </Link>
            <LiveKitRoom serverUrl={LIVEKIT_URL} token={token} connect video={false} audio={false} style={{ height: '100dvh' }}>
                <StreamViewer game={game} onClip={handleClip} />
            </LiveKitRoom>
            {clipToast && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-emerald-500 text-black text-sm font-black rounded-full shadow-lg">{clipToast}</div>
            )}
        </div>
    );
}

export default function WatchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center"><Radio className="w-8 h-8 text-cyan-400 animate-pulse" /></div>}>
            <WatchInner />
        </Suspense>
    );
}

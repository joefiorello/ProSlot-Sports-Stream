'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    LiveKitRoom,
    useTracks,
    TrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Radio, Camera, CameraOff, Mic, MicOff, ChevronLeft, WifiOff, Square } from 'lucide-react';
import { getGame, updateGameStatus, ORG_ID } from '@/lib/db';
import { fetchToken, endSession, LIVEKIT_URL } from '@/lib/livekit';
import AdminGuard from '@/lib/AdminGuard';
import ScorerPanel from '@/lib/ScorerPanel';
import RosterEditor from '@/lib/RosterEditor';
import PlayLog from '@/lib/PlayLog';
import type { Game, CameraAngle } from '@/types';

const ANGLES: { id: CameraAngle; label: string; emoji: string }[] = [
    { id: 'main', label: 'Main Camera', emoji: '🎥' },
    { id: 'plate', label: 'Home Plate', emoji: '⚾' },
    { id: 'firstbase', label: '1st Base Line', emoji: '🏃' },
    { id: 'dugout', label: 'Dugout', emoji: '🪑' },
    { id: 'outfield', label: 'Outfield', emoji: '🌿' },
    { id: 'custom', label: 'Custom / Other', emoji: '📹' },
];

function BroadcastControls({ game, angle, gameId }: { game: Game; angle: CameraAngle; gameId: string }) {
    const tracks = useTracks([Track.Source.Camera]);
    const [micOn, setMicOn] = useState(false);
    const [activeTab, setActiveTab] = useState<'controls' | 'score' | 'roster'>('controls');
    const [showPlayLog, setShowPlayLog] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const localVideoTrack = tracks.find(t => t.publication.isLocal);
    const camOn = !!localVideoTrack?.publication.videoTrack;

    useEffect(() => {
        const track = localVideoTrack?.publication.videoTrack;
        const el = videoRef.current;
        if (track && el) {
            track.attach(el);
        }
        return () => {
            if (track) track.detach();
        };
    }, [localVideoTrack, localVideoTrack?.publication.videoTrack]);

    return (
        <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
            <div className="relative flex-1 bg-black min-h-0">
                <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain"
                    style={{ display: camOn ? 'block' : 'none' }}
                />
                {!camOn && (
                    <div className="w-full h-full flex items-center justify-center flex-col gap-3" style={{ minHeight: '40vh' }}>
                        <CameraOff className="w-12 h-12 text-white/20" /><p className="text-white/30 text-sm">Camera off</p>
                    </div>
                )}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                        {camOn ? (<><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs font-black text-white">BROADCASTING</span></>) : (<><WifiOff className="w-3 h-3 text-white/40" /><span className="text-xs font-bold text-white/40">OFFLINE</span></>)}
                    </div>
                    <div className="flex items-center gap-2">
                        {game.streamCode && (
                            <div className="px-3 py-1.5 rounded-lg bg-cyan-900/40 border border-cyan-800/30 backdrop-blur-sm flex items-center gap-1.5">
                                <span className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-black">Code</span>
                                <span className="text-xs font-mono font-bold text-cyan-400">{game.streamCode}</span>
                            </div>
                        )}
                        <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                            <span className="text-xs font-bold text-cyan-400">{ANGLES.find(a => a.id === angle)?.emoji} {ANGLES.find(a => a.id === angle)?.label}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-[#111827] border-t border-white/5 flex flex-col" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                {/* Tab Switcher */}
                <div className="flex border-b border-white/5 sticky top-0 bg-[#111827] z-10">
                    {([
                        { id: 'controls' as const, label: '🎥 Controls' },
                        { id: 'score' as const, label: '⚾ Score' },
                        { id: 'roster' as const, label: '📋 Roster' },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 text-xs font-black transition-colors ${activeTab === tab.id ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-white/30'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'controls' && (
                    <div className="p-4 space-y-3">
                        <div className="text-center mb-2">
                            <p className="font-black text-white">{game.homeTeam} vs {game.awayTeam}</p>
                            <p className="text-xs text-white/40">{game.title}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <TrackToggle source={Track.Source.Camera} className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-sm transition-all ${camOn ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                                {camOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                                {camOn ? 'Camera On' : 'Start Camera'}
                            </TrackToggle>
                            <TrackToggle source={Track.Source.Microphone} onChange={setMicOn} className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-sm transition-all ${micOn ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                                {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                                {micOn ? 'Mic On' : 'Mic Off'}
                            </TrackToggle>
                        </div>
                        <button
                            onClick={() => {
                                if (confirm('End this stream? This will stop broadcasting to all viewers.')) {
                                    updateGameStatus(ORG_ID, game.id, 'ended').then(() => {
                                        window.location.href = '/dashboard';
                                    });
                                }
                            }}
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-bold text-sm bg-white/5 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all"
                        >
                            <Square className="w-4 h-4" /> End Stream
                        </button>
                        <div className="glass-card p-3 text-center"><p className="text-xs text-white/30">Keep this page open to stay live.</p></div>
                    </div>
                )}

                {activeTab === 'score' && (
                    <div className="p-4 space-y-3">
                        <ScorerPanel gameId={gameId} homeTeamName={game.homeTeam} awayTeamName={game.awayTeam} />
                        {/* Inline play log toggle */}
                        <button
                            onClick={() => setShowPlayLog(p => !p)}
                            className="w-full py-2 text-[10px] font-black text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors"
                        >
                            {showPlayLog ? '▲ Hide Play Log' : '▾ Show Play Log'}
                        </button>
                        {showPlayLog && (
                            <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden" style={{ maxHeight: 240 }}>
                                <PlayLog gameId={gameId} />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'roster' && (
                    <div className="p-4">
                        <RosterEditor gameId={gameId} homeTeamName={game.homeTeam} awayTeamName={game.awayTeam} />
                    </div>
                )}
            </div>
        </div>
    );
}

function BroadcastInner() {
    const searchParams = useSearchParams();
    const gameId = searchParams.get('gameId') ?? '';
    const [game, setGame] = useState<Game | null>(null);
    const [angle, setAngle] = useState<CameraAngle | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [participantName] = useState(`cam-${Math.random().toString(36).slice(2, 7)}`);

    useEffect(() => { if (gameId) getGame(ORG_ID, gameId).then(g => { setGame(g); setLoading(false); }); else setLoading(false); }, [gameId]);

    const handleAngleSelect = async (a: CameraAngle) => {
        if (!game) return;
        setAngle(a);
        const { token: t, sessionId: sid } = await fetchToken({ roomName: game.roomName, participantName, role: 'publisher', angle: a });
        setToken(t);
        setSessionId(sid);
        await updateGameStatus(ORG_ID, game.id, 'live');
    };

    // Auto-end the game when the broadcaster closes the tab or navigates away
    useEffect(() => {
        if (!game || !token) return; // Only active when broadcasting

        const endGame = () => {
            // Use sendBeacon for reliability during page unload
            updateGameStatus(ORG_ID, game.id, 'ended').catch(() => { });
            endSession(sessionId);
        };

        window.addEventListener('beforeunload', endGame);
        return () => {
            window.removeEventListener('beforeunload', endGame);
            // Also end the game when the component unmounts (e.g. navigating away via SPA)
            endGame();
        };
    }, [game, token]);

    // Called when LiveKit disconnects (network drop, etc.)
    const handleDisconnected = () => {
        if (game) {
            updateGameStatus(ORG_ID, game.id, 'ended').catch(() => { });
        }
        endSession(sessionId);
    };

    if (loading) return <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center"><Radio className="w-8 h-8 text-cyan-400 animate-pulse" /></div>;

    if (!game) return (
        <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4">
            <div className="glass-card p-8 text-center"><p className="text-white/40 mb-4">Game not found.</p><Link href="/dashboard" className="text-cyan-400 text-sm font-bold">← Dashboard</Link></div>
        </div>
    );

    if (!angle || !token) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex flex-col px-4 py-8">
                <Link href="/dashboard" className="flex items-center gap-1 text-white/40 hover:text-white text-sm font-bold mb-8 transition-colors"><ChevronLeft className="w-4 h-4" /> Back</Link>
                <div className="max-w-sm mx-auto w-full">
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center mx-auto mb-4"><Radio className="w-7 h-7 text-white" /></div>
                        <h1 className="text-2xl font-black text-white">Go Live</h1>
                        <p className="text-white/40 text-sm mt-1">{game.homeTeam} vs {game.awayTeam}</p>
                    </div>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 text-center">Choose your camera angle</p>
                    <div className="space-y-2">
                        {ANGLES.map(a => (
                            <button key={a.id} onClick={() => handleAngleSelect(a.id)} className="w-full flex items-center gap-4 p-4 glass-card hover:border-cyan-500/40 hover:bg-white/[0.04] transition-all text-left group">
                                <span className="text-2xl">{a.emoji}</span>
                                <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">{a.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <LiveKitRoom
            serverUrl={LIVEKIT_URL}
            token={token}
            connect
            video={{ facingMode: 'environment' }}
            audio
            onDisconnected={handleDisconnected}
            style={{ height: '100dvh' }}
        >
            <BroadcastControls game={game} angle={angle} gameId={game.id} />
        </LiveKitRoom>
    );
}

export default function BroadcastPage() {
    return (
        <AdminGuard>
            <Suspense fallback={<div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center"><Radio className="w-8 h-8 text-red-500 animate-pulse" /></div>}>
                <BroadcastInner />
            </Suspense>
        </AdminGuard>
    );
}

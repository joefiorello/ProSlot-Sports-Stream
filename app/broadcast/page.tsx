'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    LiveKitRoom,
    useLocalParticipant,
    useTracks,
    TrackToggle,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Radio, Camera, CameraOff, Mic, MicOff, ChevronLeft, WifiOff } from 'lucide-react';
import { getGame, updateGameStatus, ORG_ID } from '@/lib/db';
import { fetchToken, LIVEKIT_URL } from '@/lib/livekit';
import type { Game, CameraAngle } from '@/types';

const ANGLES: { id: CameraAngle; label: string; emoji: string }[] = [
    { id: 'main', label: 'Main Camera', emoji: '🎥' },
    { id: 'plate', label: 'Home Plate', emoji: '⚾' },
    { id: 'firstbase', label: '1st Base Line', emoji: '🏃' },
    { id: 'dugout', label: 'Dugout', emoji: '🪑' },
    { id: 'outfield', label: 'Outfield', emoji: '🌿' },
    { id: 'custom', label: 'Custom / Other', emoji: '📹' },
];

function BroadcastControls({ game, angle }: { game: Game; angle: CameraAngle }) {
    const { localParticipant } = useLocalParticipant();
    const tracks = useTracks([Track.Source.Camera]);
    const [camOn, setCamOn] = useState(false);
    const [micOn, setMicOn] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    void localParticipant;

    const localVideoTrack = tracks.find(t => t.publication.isLocal);
    useEffect(() => {
        if (localVideoTrack?.publication.videoTrack && videoRef.current) {
            localVideoTrack.publication.videoTrack.attach(videoRef.current);
        }
        return () => { if (localVideoTrack?.publication.videoTrack) localVideoTrack.publication.videoTrack.detach(); };
    }, [localVideoTrack]);

    return (
        <div className="min-h-screen bg-[#0a0f1a] flex flex-col">
            <div className="relative flex-1 bg-black min-h-0">
                {camOn ? (
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center flex-col gap-3" style={{ minHeight: '40vh' }}>
                        <CameraOff className="w-12 h-12 text-white/20" /><p className="text-white/30 text-sm">Camera off</p>
                    </div>
                )}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                        {camOn ? (<><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-xs font-black text-white">BROADCASTING</span></>) : (<><WifiOff className="w-3 h-3 text-white/40" /><span className="text-xs font-bold text-white/40">OFFLINE</span></>)}
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm">
                        <span className="text-xs font-bold text-cyan-400">{ANGLES.find(a => a.id === angle)?.emoji} {ANGLES.find(a => a.id === angle)?.label}</span>
                    </div>
                </div>
            </div>
            <div className="bg-[#111827] border-t border-white/5 p-6 space-y-4">
                <div className="text-center mb-2">
                    <p className="font-black text-white">{game.homeTeam} vs {game.awayTeam}</p>
                    <p className="text-xs text-white/40">{game.title}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <TrackToggle source={Track.Source.Camera} onChange={setCamOn} className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-sm transition-all ${camOn ? 'bg-red-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                        {camOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
                        {camOn ? 'Camera On' : 'Start Camera'}
                    </TrackToggle>
                    <TrackToggle source={Track.Source.Microphone} onChange={setMicOn} className={`flex items-center justify-center gap-2 p-4 rounded-xl font-bold text-sm transition-all ${micOn ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
                        {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                        {micOn ? 'Mic On' : 'Mic Off'}
                    </TrackToggle>
                </div>
                <div className="glass-card p-3 text-center"><p className="text-xs text-white/30">Keep this page open to stay live.</p></div>
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
    const [loading, setLoading] = useState(true);
    const [participantName] = useState(`cam-${Math.random().toString(36).slice(2, 7)}`);

    useEffect(() => { if (gameId) getGame(ORG_ID, gameId).then(g => { setGame(g); setLoading(false); }); else setLoading(false); }, [gameId]);

    const handleAngleSelect = async (a: CameraAngle) => {
        if (!game) return;
        setAngle(a);
        const t = await fetchToken({ roomName: game.roomName, participantName, role: 'publisher', angle: a });
        setToken(t);
        await updateGameStatus(ORG_ID, game.id, 'live');
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
        <LiveKitRoom serverUrl={LIVEKIT_URL} token={token} connect video audio style={{ height: '100dvh' }}>
            <BroadcastControls game={game} angle={angle} />
        </LiveKitRoom>
    );
}

export default function BroadcastPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center"><Radio className="w-8 h-8 text-red-500 animate-pulse" /></div>}>
            <BroadcastInner />
        </Suspense>
    );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    LiveKitRoom,
    GridLayout,
    ParticipantTile,
    RoomAudioRenderer,
    useTracks,
    useParticipants,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { Radio, Users, ChevronLeft, Scissors, Volume2, VolumeX } from 'lucide-react';
import { getGame, ORG_ID } from '@/lib/db';
import { fetchToken, LIVEKIT_URL, requestClip } from '@/lib/livekit';
import type { Game } from '@/types';

const ANGLE_LABELS: Record<string, string> = {
    main: 'Main',
    plate: 'Home Plate',
    firstbase: '1st Base',
    dugout: 'Dugout',
    outfield: 'Outfield',
    custom: 'Custom',
};

// ── Inner room component (must be inside LiveKitRoom) ──────────────────────────
function StreamViewer({
    game,
    onClip,
}: {
    game: Game;
    onClip: (start: number, end: number) => void;
}) {
    const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
    const participants = useParticipants();
    const [activeTrack, setActiveTrack] = useState(0);
    const [muted, setMuted] = useState(false);
    const [clipStart, setClipStart] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const intervalRef = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
        return () => clearInterval(intervalRef.current);
    }, []);

    const activeTracks = tracks.filter(t => t.publication.isSubscribed || t.publication.isLocal);
    const selectedTrack = activeTracks[activeTrack] ?? activeTracks[0];

    const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

    return (
        <div className="flex flex-col h-screen bg-[#0a0f1a]">
            {/* Main video */}
            <div className="relative flex-1 bg-black">
                {selectedTrack ? (
                    <ParticipantTile
                        trackRef={selectedTrack}
                        className="w-full h-full"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center">
                            <Radio className="w-12 h-12 text-white/10 mx-auto mb-3 animate-pulse" />
                            <p className="text-white/30 text-sm">Waiting for stream to begin...</p>
                        </div>
                    </div>
                )}

                {/* Overlays */}
                <div className="absolute top-4 left-4 flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500 rounded-lg shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs font-black text-white">LIVE</span>
                    </div>
                    <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <span className="text-xs font-mono text-white">{fmt(elapsed)}</span>
                    </div>
                </div>

                <div className="absolute top-4 right-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-sm rounded-lg">
                        <Users className="w-3.5 h-3.5 text-white/60" />
                        <span className="text-xs font-bold text-white">{participants.length}</span>
                    </div>
                    <button
                        onClick={() => setMuted(m => !m)}
                        className="p-2 bg-black/60 backdrop-blur-sm rounded-lg hover:bg-black/80 transition-colors"
                    >
                        {muted ? <VolumeX className="w-4 h-4 text-white" /> : <Volume2 className="w-4 h-4 text-white" />}
                    </button>
                </div>

                {/* Score overlay */}
                {game.score && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-2 bg-black/80 backdrop-blur-sm rounded-full">
                        <span className="text-white font-black text-sm">{game.homeTeam}</span>
                        <span className="text-2xl font-black text-white">{game.score.home}</span>
                        <span className="text-white/30 text-sm">–</span>
                        <span className="text-2xl font-black text-white">{game.score.away}</span>
                        <span className="text-white font-black text-sm">{game.awayTeam}</span>
                    </div>
                )}
            </div>

            {/* Bottom controls */}
            <div className="px-4 py-3 border-t border-white/5 bg-[#111827]">
                {/* Angle switcher */}
                {activeTracks.length > 1 && (
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                        {activeTracks.map((track, i) => {
                            const meta = track.participant?.metadata ? JSON.parse(track.participant.metadata) : {};
                            const label = ANGLE_LABELS[meta.angle] || track.participant?.name || `Camera ${i + 1}`;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setActiveTrack(i)}
                                    className={`angle-chip flex-shrink-0 ${i === activeTrack ? 'active' : 'inactive'}`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Clip controls */}
                <div className="flex items-center justify-between">
                    <div className="text-xs text-white/30">
                        {activeTracks.length} {activeTracks.length === 1 ? 'camera' : 'cameras'} connected
                    </div>
                    <div className="flex items-center gap-2">
                        {clipStart !== null ? (
                            <>
                                <span className="text-xs text-amber-400 font-bold animate-pulse">
                                    ● Clipping: {fmt(elapsed - clipStart)}
                                </span>
                                <button
                                    onClick={() => {
                                        onClip(clipStart, elapsed);
                                        setClipStart(null);
                                    }}
                                    className="px-4 py-1.5 bg-amber-500 text-black text-xs font-black rounded-lg"
                                >
                                    Save Clip
                                </button>
                                <button
                                    onClick={() => setClipStart(null)}
                                    className="px-3 py-1.5 bg-white/10 text-white text-xs font-bold rounded-lg"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setClipStart(elapsed)}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                <Scissors className="w-3.5 h-3.5" /> Clip
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <RoomAudioRenderer muted={muted} />
        </div>
    );
}

// ── Page component ─────────────────────────────────────────────────────────────
export default function StreamPage() {
    const { gameId } = useParams<{ gameId: string }>();
    const [game, setGame] = useState<Game | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [clipToast, setClipToast] = useState<string | null>(null);

    useEffect(() => {
        async function init() {
            const g = await getGame(ORG_ID, gameId);
            if (!g) { setLoading(false); return; }
            setGame(g);
            const t = await fetchToken({
                roomName: g.roomName,
                participantName: `viewer-${Date.now()}`,
                role: 'viewer',
            });
            setToken(t);
            setLoading(false);
        }
        init();
    }, [gameId]);

    const handleClip = async (start: number, end: number) => {
        if (!game) return;
        try {
            await requestClip({
                gameId: game.id,
                title: `Clip at ${new Date().toLocaleTimeString()}`,
                startTime: start,
                endTime: end,
                orgId: ORG_ID,
            });
            setClipToast('Clip saved! Processing...');
            setTimeout(() => setClipToast(null), 3000);
        } catch {
            setClipToast('Failed to save clip.');
            setTimeout(() => setClipToast(null), 3000);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="text-center">
                    <Radio className="w-10 h-10 text-cyan-400 mx-auto mb-3 animate-pulse" />
                    <p className="text-white/40 text-sm">Connecting to stream...</p>
                </div>
            </div>
        );
    }

    if (!game || !token) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <div className="text-center glass-card p-10">
                    <p className="text-white/40 mb-4">Game not found.</p>
                    <Link href="/dashboard" className="text-cyan-400 text-sm font-bold hover:text-cyan-300">← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            {/* Back link */}
            <Link
                href="/dashboard"
                className="fixed top-4 left-4 z-50 flex items-center gap-1 px-3 py-2 bg-black/60 backdrop-blur-sm text-white/70 hover:text-white text-xs font-bold rounded-lg transition-colors"
            >
                <ChevronLeft className="w-3.5 h-3.5" /> {game.homeTeam} vs {game.awayTeam}
            </Link>

            <LiveKitRoom
                serverUrl={LIVEKIT_URL}
                token={token}
                connect={true}
                video={false}
                audio={false}
                style={{ height: '100dvh' }}
            >
                <StreamViewer game={game} onClip={handleClip} />
            </LiveKitRoom>

            {/* Clip toast */}
            {clipToast && (
                <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2.5 bg-emerald-500 text-black text-sm font-black rounded-full shadow-lg animate-fade-in">
                    {clipToast}
                </div>
            )}
        </div>
    );
}

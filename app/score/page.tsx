'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Menu, X } from 'lucide-react';
import { getGame, getGameByCode, ORG_ID } from '@/lib/db';
import AdminGuard from '@/lib/AdminGuard';
import FieldScorerPanel from '@/lib/FieldScorerPanel';
import RosterEditor from '@/lib/RosterEditor';
import PlayLog from '@/lib/PlayLog';
import type { Game } from '@/types';

// ─── Fonts ────────────────────────────────────────────────────────────────────
const C = {
    bg: '#0d1117',
    surface: '#161b22',
    border: 'rgba(255,255,255,0.08)',
    text: '#e6edf3',
    textMuted: 'rgba(255,255,255,0.4)',
};

// ─── Inner (needs Suspense for useSearchParams) ───────────────────────────────
function ScoreInner() {
    const searchParams = useSearchParams();
    const gameId = searchParams.get('gameId') ?? '';
    const code = searchParams.get('code') ?? '';

    const [game, setGame] = useState<Game | null>(null);
    const [loading, setLoading] = useState(true);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerTab, setDrawerTab] = useState<'roster' | 'log'>('roster');

    useEffect(() => {
        if (!gameId && !code) { setLoading(false); return; }
        async function load() {
            let g: Game | null = null;
            if (code) g = await getGameByCode(ORG_ID, code);
            else if (gameId) g = await getGame(ORG_ID, gameId);
            setGame(g);
            setLoading(false);
        }
        load();
    }, [gameId, code]);

    if (loading) return <Loader />;

    if (!game) return (
        <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 320, width: '100%' }}>
                <p style={{ color: C.textMuted, fontSize: 14, marginBottom: 8 }}>Game not found.</p>
                <Link href="/dashboard" style={{ color: '#3b82f6', fontSize: 14, fontWeight: 700 }}>← Back to Dashboard</Link>
            </div>
        </div>
    );

    return (
        <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

            {/* Header */}
            <header style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                background: '#0a0f1a', borderBottom: `1px solid ${C.border}`, flexShrink: 0, zIndex: 10,
            }}>
                <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', color: C.textMuted, padding: 4, borderRadius: 8 }}>
                    <ChevronLeft size={20} />
                </Link>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {game.homeTeam} vs {game.awayTeam}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f0c040', flexShrink: 0 }} />
                        <p style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Scoring Mode</p>
                    </div>
                </div>
                <button onClick={() => setDrawerOpen(true)} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
                    color: C.textMuted, cursor: 'pointer',
                }}>
                    <Menu size={18} />
                </button>
            </header>

            {/* Scorer — takes all remaining height */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <FieldScorerPanel
                    gameId={game.id}
                    homeTeamName={game.homeTeam}
                    awayTeamName={game.awayTeam}
                />
            </div>

            {/* Slide-in Drawer */}
            {drawerOpen && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
                    {/* Backdrop */}
                    <div
                        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }}
                        onClick={() => setDrawerOpen(false)}
                    />
                    {/* Drawer panel */}
                    <div style={{
                        position: 'absolute', top: 0, right: 0, bottom: 0,
                        width: '88%', maxWidth: 380,
                        background: C.surface, display: 'flex', flexDirection: 'column',
                        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
                    }}>
                        {/* Drawer header */}
                        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                            <p style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.text }}>{game.homeTeam} vs {game.awayTeam}</p>
                            <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: 4 }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Drawer tabs */}
                        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                            {([
                                { id: 'roster' as const, label: '📋 Roster' },
                                { id: 'log' as const, label: '📜 Play Log' },
                            ]).map(tab => (
                                <button key={tab.id} onClick={() => setDrawerTab(tab.id)} style={{
                                    flex: 1, padding: '12px', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                                    background: 'none', border: 'none',
                                    borderBottom: drawerTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                                    color: drawerTab === tab.id ? '#3b82f6' : C.textMuted,
                                    transition: 'color 0.15s',
                                }}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Drawer content */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {drawerTab === 'roster' && (
                                <div style={{ padding: 16 }}>
                                    <RosterEditor gameId={game.id} homeTeamName={game.homeTeam} awayTeamName={game.awayTeam} />
                                </div>
                            )}
                            {drawerTab === 'log' && (
                                <PlayLog gameId={game.id} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Loader() {
    return (
        <div style={{ minHeight: '100dvh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f0c040', animation: 'pulse 1s infinite' }} />
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.2}}`}</style>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ScorePage() {
    return (
        <AdminGuard>
            <Suspense fallback={<Loader />}>
                <ScoreInner />
            </Suspense>
        </AdminGuard>
    );
}

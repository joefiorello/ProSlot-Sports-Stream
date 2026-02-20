'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Radio, Plus, Users, Clock, ChevronRight, Video, Tv } from 'lucide-react';
import { getGames, createGame, ORG_ID } from '@/lib/db';
import { createStreamRoom } from '@/lib/livekit';
import type { Game } from '@/types';

const STATUS_COLORS: Record<string, string> = {
    live: 'bg-red-500 text-white',
    scheduled: 'bg-white/10 text-white/60',
    ended: 'bg-white/5 text-white/30',
    archived: 'bg-white/5 text-white/20',
};

const STATUS_LABELS: Record<string, string> = {
    live: '🔴 LIVE',
    scheduled: 'Scheduled',
    ended: 'Ended',
    archived: 'Archived',
};

export default function DashboardPage() {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({
        title: '',
        homeTeam: '',
        awayTeam: '',
        sport: 'Baseball',
        scheduledAt: new Date().toISOString().slice(0, 16),
    });

    useEffect(() => {
        getGames(ORG_ID).then(g => { setGames(g); setLoading(false); });
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const gameId = await createGame({
                ...form,
                orgId: ORG_ID,
                userId: 'admin', // replace with real auth user
            });
            await createStreamRoom({ gameId, title: form.title, orgId: ORG_ID });
            const updated = await getGames(ORG_ID);
            setGames(updated);
            setShowCreate(false);
            setForm({ title: '', homeTeam: '', awayTeam: '', sport: 'Baseball', scheduledAt: new Date().toISOString().slice(0, 16) });
        } catch (err) {
            console.error(err);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1a]">
            {/* Nav */}
            <nav className="border-b border-white/5 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" style={{ background: 'rgba(10,15,26,0.95)' }}>
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                        <Radio className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-black text-white text-sm">ProSlot <span className="text-cyan-400">Stream</span></span>
                </Link>
                <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black text-sm font-black rounded-lg transition-all"
                >
                    <Plus className="w-4 h-4" /> New Game
                </button>
            </nav>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-white tracking-tight">Game Dashboard</h1>
                    <p className="text-white/40 text-sm mt-1">Manage live streams, cameras, and highlights</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Total Games', value: games.length, icon: Tv },
                        { label: 'Live Now', value: games.filter(g => g.status === 'live').length, icon: Radio, accent: true },
                        { label: 'Scheduled', value: games.filter(g => g.status === 'scheduled').length, icon: Clock },
                        { label: 'Archived', value: games.filter(g => g.status === 'archived').length, icon: Video },
                    ].map(stat => {
                        const Icon = stat.icon;
                        return (
                            <div key={stat.label} className="glass-card p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <Icon className={`w-4 h-4 ${stat.accent ? 'text-red-400' : 'text-white/30'}`} />
                                    {stat.accent && <span className="live-dot" />}
                                </div>
                                <div className={`text-2xl font-black ${stat.accent ? 'text-red-400' : 'text-white'}`}>{stat.value}</div>
                                <div className="text-xs text-white/40 font-medium mt-0.5">{stat.label}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Games List */}
                <div className="glass-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                        <h2 className="font-bold text-white">Games</h2>
                        <span className="text-xs text-white/30">{games.length} total</span>
                    </div>

                    {loading ? (
                        <div className="py-20 text-center text-white/30 text-sm">Loading games...</div>
                    ) : games.length === 0 ? (
                        <div className="py-20 text-center">
                            <Radio className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-white/40 text-sm">No games yet. Create your first stream.</p>
                            <button onClick={() => setShowCreate(true)} className="mt-4 px-6 py-2 bg-cyan-500 text-black text-sm font-black rounded-lg">
                                Create Game
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {games.map(game => (
                                <div key={game.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                            <Radio className="w-4 h-4 text-white/40" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-white text-sm">{game.homeTeam} vs {game.awayTeam}</div>
                                            <div className="text-xs text-white/40 mt-0.5">{game.title} · {game.sport}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {game.status === 'live' && (
                                            <span className="text-white/40 text-xs flex items-center gap-1">
                                                <Users className="w-3 h-3" /> {game.viewerCount ?? 0}
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${STATUS_COLORS[game.status]}`}>
                                            {STATUS_LABELS[game.status]}
                                        </span>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                href={`/broadcast/${game.id}`}
                                                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 text-xs font-bold rounded-lg transition-colors"
                                            >
                                                Camera
                                            </Link>
                                            <Link
                                                href={`/stream/${game.id}`}
                                                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                            >
                                                <ChevronRight className="w-4 h-4 text-white/50" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Create Game Modal ── */}
            {showCreate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="glass-card w-full max-w-md p-6 border-white/20">
                        <h2 className="text-xl font-black text-white mb-6">Create New Game</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-1.5">Game Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Spring Championship Game 1"
                                    value={form.title}
                                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-500/50"
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-1.5">Home Team</label>
                                    <input
                                        type="text"
                                        placeholder="Yankees"
                                        value={form.homeTeam}
                                        onChange={e => setForm(p => ({ ...p, homeTeam: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-500/50"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-1.5">Away Team</label>
                                    <input
                                        type="text"
                                        placeholder="Red Sox"
                                        value={form.awayTeam}
                                        onChange={e => setForm(p => ({ ...p, awayTeam: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 text-sm focus:outline-none focus:border-cyan-500/50"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-1.5">Sport</label>
                                    <select
                                        value={form.sport}
                                        onChange={e => setForm(p => ({ ...p, sport: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                    >
                                        {['Baseball', 'Softball', 'Basketball', 'Soccer', 'Football', 'Lacrosse'].map(s => (
                                            <option key={s} value={s} style={{ background: '#111827' }}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-white/50 uppercase tracking-widest block mb-1.5">Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={form.scheduledAt}
                                        onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/50"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreate(false)}
                                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-sm font-black rounded-lg transition-colors"
                                >
                                    {creating ? 'Creating...' : 'Create Game'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

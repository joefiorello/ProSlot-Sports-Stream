import Link from 'next/link';
import { Radio, Zap, Film, Users, Shield, Clock } from 'lucide-react';

const features = [
    {
        icon: Radio,
        title: 'Go Live Instantly',
        desc: 'Stream from any phone browser in seconds. No app download required.',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
    },
    {
        icon: Zap,
        title: 'Multi-Angle Streams',
        desc: 'Connect multiple cameras simultaneously. Viewers choose their angle.',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
    },
    {
        icon: Film,
        title: 'Save Highlights',
        desc: 'Clip any moment from the live stream. Share instantly with family.',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
    },
    {
        icon: Users,
        title: 'Unlimited Viewers',
        desc: 'Grandparents, cousins, scouts — anyone can watch from anywhere.',
        color: 'text-violet-400',
        bg: 'bg-violet-500/10',
    },
    {
        icon: Shield,
        title: 'Private by Default',
        desc: 'Streams are org-scoped. Only your team sees your games.',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
    },
    {
        icon: Clock,
        title: '24-Hour Replay',
        desc: 'Every stream is saved for 24 hours so nobody misses a thing.',
        color: 'text-pink-400',
        bg: 'bg-pink-500/10',
    },
];

export default function Home() {
    return (
        <div className="min-h-screen bg-[#0a0f1a]">
            {/* ── Nav ── */}
            <nav className="fixed top-0 inset-x-0 z-50 border-b border-white/5" style={{ background: 'rgba(10,15,26,0.9)', backdropFilter: 'blur(20px)' }}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                            <Radio className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-black text-white tracking-tight">ProSlot <span className="text-cyan-400">Stream</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="text-sm font-semibold text-white/70 hover:text-white transition-colors">
                            Dashboard
                        </Link>
                        <Link
                            href="/dashboard"
                            className="text-sm font-black bg-cyan-500 hover:bg-cyan-400 text-black px-4 py-2 rounded-lg transition-all"
                        >
                            Start Streaming
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Hero ── */}
            <section className="relative pt-32 pb-24 px-4 overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

                <div className="relative max-w-5xl mx-auto text-center">
                    {/* Live badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 bg-red-500/10 mb-8">
                        <span className="live-dot" />
                        <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Now Live: Field 3 vs Lincoln Tigers</span>
                    </div>

                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter leading-none mb-6">
                        Every game.
                        <br />
                        <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Every angle.
                        </span>
                        <br />
                        Live.
                    </h1>

                    <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
                        ProSlot Stream lets youth sports organizations broadcast live games from multiple phone cameras simultaneously. Multi-angle, low-latency, no app required.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/dashboard"
                            className="px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-sm uppercase tracking-widest rounded-xl transition-all hover:scale-105 active:scale-95"
                        >
                            Start a Stream →
                        </Link>
                        <Link
                            href="/dashboard"
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm uppercase tracking-widest rounded-xl transition-all"
                        >
                            Watch a Game
                        </Link>
                    </div>
                </div>

                {/* Mock stream preview */}
                <div className="relative max-w-4xl mx-auto mt-20">
                    <div className="video-container shadow-2xl shadow-cyan-500/10 border border-white/10">
                        <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center" style={{ minHeight: '360px' }}>
                            <div className="text-center">
                                <div className="w-20 h-20 rounded-full bg-white/5 border-2 border-white/10 flex items-center justify-center mx-auto mb-4">
                                    <Radio className="w-8 h-8 text-cyan-400" />
                                </div>
                                <p className="text-white/40 text-sm font-medium">Live stream preview</p>
                            </div>
                        </div>
                        {/* Overlays */}
                        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-500 rounded-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            <span className="text-xs font-black text-white uppercase">Live</span>
                        </div>
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 bg-black/60 rounded-md backdrop-blur-sm">
                            <Users className="w-3 h-3 text-white/60" />
                            <span className="text-xs font-bold text-white">142</span>
                        </div>
                        {/* Angle switcher preview */}
                        <div className="absolute bottom-4 left-4 flex gap-2">
                            {['Main', 'Plate', '1st Base'].map((a, i) => (
                                <button key={a} className={`angle-chip ${i === 0 ? 'active' : 'inactive'}`}>{a}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Features ── */}
            <section className="py-24 px-4 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
                            Built for the sideline.
                        </h2>
                        <p className="text-white/50 max-w-xl mx-auto">
                            Everything you need to broadcast a youth sports game — nothing you don&apos;t.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((f) => {
                            const Icon = f.icon;
                            return (
                                <div key={f.title} className="glass-card p-6 hover:border-white/20 transition-all group">
                                    <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className={`w-5 h-5 ${f.color}`} />
                                    </div>
                                    <h3 className="font-bold text-white text-lg mb-2">{f.title}</h3>
                                    <p className="text-white/50 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── How It Works ── */}
            <section className="py-24 px-4 border-t border-white/5">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
                        Stream in 3 steps.
                    </h2>
                    <p className="text-white/50 mb-16">No equipment. No setup. Just open your browser.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { step: '01', title: 'Create a Game', desc: 'Name the teams, set the date, create the room. Takes 30 seconds.' },
                            { step: '02', title: 'Share the Camera Link', desc: 'Send the broadcast link to parents with phones at different angles.' },
                            { step: '03', title: 'Go Live', desc: 'Viewers open the stream link — they watch, switch angles, and save clips.' },
                        ].map((s) => (
                            <div key={s.step} className="relative">
                                <div className="text-6xl font-black text-white/5 mb-4">{s.step}</div>
                                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                                <p className="text-white/50 text-sm leading-relaxed">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-24 px-4 border-t border-white/5">
                <div className="max-w-2xl mx-auto text-center glass-card p-12">
                    <h2 className="text-3xl font-black text-white mb-4">Ready to stream your first game?</h2>
                    <p className="text-white/50 mb-8">Free to start. No hardware required.</p>
                    <Link
                        href="/dashboard"
                        className="inline-block px-10 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black text-sm uppercase tracking-widest rounded-xl hover:scale-105 transition-transform"
                    >
                        Open Dashboard →
                    </Link>
                </div>
            </section>

            {/* ── Footer ── */}
            <footer className="border-t border-white/5 py-8 px-4 text-center text-white/30 text-xs">
                <p>© {new Date().getFullYear()} ProSlot Sports Stream · OrgID: ProSlotSportsStream</p>
            </footer>
        </div>
    );
}

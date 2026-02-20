'use client';

import { useAuth } from '@/lib/auth-context';
import { Radio, LogIn, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function SignInPage() {
    const { user, loading, isAdmin, signInWithGoogle, signOut } = useAuth();
    const router = useRouter();

    // If already signed in as admin, redirect to dashboard
    useEffect(() => {
        if (!loading && user && isAdmin) {
            router.replace('/dashboard');
        }
    }, [user, loading, isAdmin, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
        );
    }

    // Signed in but NOT admin
    if (user && !isAdmin) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4">
                <div className="w-full max-w-sm text-center">
                    <div className="glass-card p-8 border-red-500/20">
                        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-xl font-black text-white mb-2">Access Denied</h2>
                        <p className="text-white/40 text-sm mb-2">
                            Signed in as <span className="text-white/60 font-bold">{user.email}</span>
                        </p>
                        <p className="text-white/30 text-xs mb-6">
                            Only authorized admins can create streams. Contact your organization admin for access.
                        </p>
                        <button
                            onClick={signOut}
                            className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white/60 text-sm font-bold rounded-xl transition-colors"
                        >
                            Sign out & try another account
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Not signed in — show sign-in
    return (
        <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center px-4">
            <div className="w-full max-w-sm text-center">
                {/* Logo */}
                <div className="mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-cyan-500/20">
                        <Radio className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight">
                        ProSlot <span className="text-cyan-400">Stream</span>
                    </h1>
                    <p className="text-white/40 text-sm mt-1">Admin Sign In</p>
                </div>

                {/* Sign in card */}
                <div className="glass-card p-8">
                    <p className="text-white/50 text-sm mb-6">
                        Sign in with your admin Google account to manage streams.
                    </p>

                    <button
                        onClick={signInWithGoogle}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white hover:bg-white/90 text-gray-800 font-bold text-sm rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Google
                    </button>
                </div>

                <p className="text-white/20 text-xs mt-6">
                    Viewers don&apos;t need to sign in — just enter a stream code.
                </p>
            </div>
        </div>
    );
}

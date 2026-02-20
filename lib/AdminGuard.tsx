'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { Radio } from 'lucide-react';

export default function AdminGuard({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || !isAdmin)) {
            router.replace('/signin');
        }
    }, [user, loading, isAdmin, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
        );
    }

    if (!user || !isAdmin) {
        return (
            <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center">
                <Radio className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
        );
    }

    return <>{children}</>;
}

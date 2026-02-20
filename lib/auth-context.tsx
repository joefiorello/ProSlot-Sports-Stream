'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User,
    signInWithPopup,
    GoogleAuthProvider,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from 'firebase/auth';
import { auth } from './firebase';

const ADMIN_EMAILS = ['joe@proslotbos.com'];

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isAdmin: false,
    signInWithGoogle: async () => { },
    signOut: async () => { },
});

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
    };

    const signOutFn = async () => {
        await firebaseSignOut(auth);
    };

    const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

    return (
        <AuthContext.Provider value={{ user, loading, isAdmin, signInWithGoogle, signOut: signOutFn }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}

import { db } from './firebase';
import {
    doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';
import { ORG_ID } from './db';
import type { Player } from '@/types';

export type RosterSide = 'home' | 'away';

// Firestore path: organizations/{ORG_ID}/games/{gameId}/roster/{side}
// Each side document stores: { players: Player[], updatedAt }

function rosterDoc(gameId: string, side: RosterSide) {
    return doc(db, 'organizations', ORG_ID, 'games', gameId, 'roster', side);
}

/** Save the full lineup for one side. */
export async function saveRoster(gameId: string, side: RosterSide, players: Player[]) {
    await setDoc(rosterDoc(gameId, side), {
        players,
        updatedAt: serverTimestamp(),
    });
}

/** Fetch both rosters once. Returns { home: Player[], away: Player[] }. */
export async function getRoster(gameId: string): Promise<{ home: Player[]; away: Player[] }> {
    const [homeSnap, awaySnap] = await Promise.all([
        getDoc(rosterDoc(gameId, 'home')),
        getDoc(rosterDoc(gameId, 'away')),
    ]);
    return {
        home: (homeSnap.data()?.players ?? []) as Player[],
        away: (awaySnap.data()?.players ?? []) as Player[],
    };
}

/** Subscribe to live roster updates. Fires whenever either side changes. */
export function subscribeRoster(
    gameId: string,
    cb: (roster: { home: Player[]; away: Player[] }) => void
): () => void {
    let home: Player[] = [];
    let away: Player[] = [];

    const unsubHome = onSnapshot(rosterDoc(gameId, 'home'), (snap) => {
        home = (snap.data()?.players ?? []) as Player[];
        cb({ home, away });
    });
    const unsubAway = onSnapshot(rosterDoc(gameId, 'away'), (snap) => {
        away = (snap.data()?.players ?? []) as Player[];
        cb({ home, away });
    });

    return () => { unsubHome(); unsubAway(); };
}

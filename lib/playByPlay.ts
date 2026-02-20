import { db } from './firebase';
import {
    collection, addDoc, onSnapshot, serverTimestamp, query, orderBy, getDocs, limit, deleteDoc
} from 'firebase/firestore';
import { ORG_ID } from './db';
import type { PlayEvent } from '@/types';

// Firestore path: organizations/{ORG_ID}/games/{gameId}/plays (ordered collection)

function playsRef(gameId: string) {
    return collection(db, 'organizations', ORG_ID, 'games', gameId, 'plays');
}

/** Append a play event to the log. Returns the new document ID. */
export async function addPlayEvent(
    gameId: string,
    event: Omit<PlayEvent, 'id' | 'timestamp'>
): Promise<string> {
    const ref = await addDoc(playsRef(gameId), {
        ...event,
        timestamp: serverTimestamp(),
    });
    return ref.id;
}

/** Subscribe to the play log in chronological order. */
export function subscribePlayLog(
    gameId: string,
    cb: (events: PlayEvent[]) => void
): () => void {
    const q = query(playsRef(gameId), orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snap) => {
        const events = snap.docs.map(d => ({
            ...(d.data() as Omit<PlayEvent, 'id'>),
            id: d.id,
        }));
        cb(events);
    });
}

/**
 * Delete the most recent play event and return the prevGameState stored in it
 * so the caller can restore the game state.
 */
export async function undoLastPlay(gameId: string): Promise<Record<string, unknown> | null> {
    const q = query(playsRef(gameId), orderBy('timestamp', 'desc'), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const lastDoc = snap.docs[0];
    const prevState = (lastDoc.data().prevGameState ?? null) as Record<string, unknown> | null;
    await deleteDoc(lastDoc.ref);
    return prevState;
}

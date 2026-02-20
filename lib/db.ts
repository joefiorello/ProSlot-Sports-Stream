import { db } from './firebase';
import {
    collection, doc, addDoc, getDoc, getDocs, deleteDoc,
    query, where, orderBy, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import type { Game, Clip, CreateGamePayload, CreateClipPayload } from '@/types';

const ORG_ID = 'ProSlotSportsStream';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateStreamCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // removed ambiguous O, 0, 1, I
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// ─── Games ────────────────────────────────────────────────────────────────────

export async function createGame(payload: CreateGamePayload): Promise<string> {
    const streamCode = generateStreamCode();
    const ref = await addDoc(collection(db, 'organizations', payload.orgId, 'games'), {
        ...payload,
        roomName: `game-${Date.now()}`,
        status: 'scheduled',
        streamCode,
        viewerCount: 0,
        createdAt: Timestamp.now(),
    });
    return ref.id;
}

export async function getGameByCode(orgId: string, code: string): Promise<Game | null> {
    const q = query(
        collection(db, 'organizations', orgId, 'games'),
        where('streamCode', '==', code.toUpperCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;

    // Use the first matching game (codes should be statistically unique)
    const doc = snap.docs[0];
    const d = doc.data();
    return {
        ...d,
        id: doc.id,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
    } as Game;
}

export async function getGame(orgId: string, gameId: string): Promise<Game | null> {
    const snap = await getDoc(doc(db, 'organizations', orgId, 'games', gameId));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
        ...d,
        id: snap.id,
        createdAt: d.createdAt instanceof Timestamp ? d.createdAt.toDate().toISOString() : d.createdAt,
    } as Game;
}

export async function getGames(orgId: string): Promise<Game[]> {
    const q = query(
        collection(db, 'organizations', orgId, 'games'),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        } as Game;
    });
}

export async function updateGameStatus(
    orgId: string,
    gameId: string,
    status: Game['status'],
    extras: Partial<Game> = {}
) {
    await updateDoc(doc(db, 'organizations', orgId, 'games', gameId), {
        status,
        ...extras,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteGame(orgId: string, gameId: string) {
    await deleteDoc(doc(db, 'organizations', orgId, 'games', gameId));
}

// ─── Clips ────────────────────────────────────────────────────────────────────

export async function createClip(payload: CreateClipPayload): Promise<string> {
    const ref = await addDoc(collection(db, 'organizations', payload.orgId, 'clips'), {
        ...payload,
        status: 'processing',
        createdAt: Timestamp.now(),
    });
    return ref.id;
}

export async function getClipsForGame(orgId: string, gameId: string): Promise<Clip[]> {
    const q = query(
        collection(db, 'organizations', orgId, 'clips'),
        where('gameId', '==', gameId),
        orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => {
        const data = d.data();
        return {
            ...data,
            id: d.id,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
        } as Clip;
    });
}

export { ORG_ID };

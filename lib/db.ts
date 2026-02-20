import { db } from './firebase';
import {
    collection, doc, addDoc, getDoc, getDocs,
    query, where, orderBy, updateDoc, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import type { Game, Clip, CreateGamePayload, CreateClipPayload } from '@/types';

const ORG_ID = 'ProSlotSportsStream';

// ─── Games ────────────────────────────────────────────────────────────────────

export async function createGame(payload: CreateGamePayload): Promise<string> {
    const ref = await addDoc(collection(db, 'organizations', payload.orgId, 'games'), {
        ...payload,
        roomName: `game-${Date.now()}`,
        status: 'scheduled',
        viewerCount: 0,
        createdAt: serverTimestamp(),
    });
    return ref.id;
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

// ─── Clips ────────────────────────────────────────────────────────────────────

export async function createClip(payload: CreateClipPayload): Promise<string> {
    const ref = await addDoc(collection(db, 'organizations', payload.orgId, 'clips'), {
        ...payload,
        status: 'processing',
        createdAt: serverTimestamp(),
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
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Clip);
}

export { ORG_ID };

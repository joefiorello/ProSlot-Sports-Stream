import { db } from './firebase';
import {
    doc, setDoc, updateDoc, onSnapshot, serverTimestamp, getDoc
} from 'firebase/firestore';
import { ORG_ID } from './db';

export interface TeamState {
    name: string;
    score: number;
    hits: number;
    errors: number;
}

export interface BatterStat {
    ab: number;
    hits: number;
}

export interface GameState {
    homeTeam: TeamState;
    awayTeam: TeamState;
    inning: number;
    isTopInning: boolean;    // true = Away batting, false = Home batting
    balls: number;
    strikes: number;
    outs: number;
    onFirst: boolean;
    onSecond: boolean;
    onThird: boolean;
    lastPlay: string;
    isActive: boolean;
    pitchCount: number;           // current pitcher's pitch count this half-inning
    batterStats: Record<string, BatterStat>; // keyed by player ID
    updatedAt?: unknown;
}

export const DEFAULT_GAME_STATE: GameState = {
    homeTeam: { name: 'Home', score: 0, hits: 0, errors: 0 },
    awayTeam: { name: 'Away', score: 0, hits: 0, errors: 0 },
    inning: 1,
    isTopInning: true,
    balls: 0,
    strikes: 0,
    outs: 0,
    onFirst: false,
    onSecond: false,
    onThird: false,
    lastPlay: '',
    isActive: true,
    pitchCount: 0,
    batterStats: {},
};

function gameStateRef(gameId: string) {
    return doc(db, 'organizations', ORG_ID, 'games', gameId, 'scoring', 'gameState');
}

export async function initGameState(gameId: string, homeTeamName: string, awayTeamName: string) {
    const ref = gameStateRef(gameId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, {
            ...DEFAULT_GAME_STATE,
            homeTeam: { ...DEFAULT_GAME_STATE.homeTeam, name: homeTeamName },
            awayTeam: { ...DEFAULT_GAME_STATE.awayTeam, name: awayTeamName },
            updatedAt: serverTimestamp(),
        });
    }
    return ref;
}

export async function updateGameState(gameId: string, partial: Partial<GameState>) {
    await updateDoc(gameStateRef(gameId), {
        ...partial,
        updatedAt: serverTimestamp(),
    });
}

export function subscribeGameState(gameId: string, cb: (gs: GameState | null) => void) {
    return onSnapshot(gameStateRef(gameId), (snap) => {
        if (!snap.exists()) { cb(null); return; }
        const data = snap.data() as GameState;
        // Ensure new fields have defaults for older game documents
        cb({
            ...data,
            pitchCount: data.pitchCount ?? 0,
            batterStats: data.batterStats ?? {},
        });
    });
}

// ─── Scoring helpers ───────────────────────────────────────────────────────────

/** Increment pitch count helper — always tack onto the returned patch. */
function withPitch(patch: Partial<GameState>, gs: GameState): Partial<GameState> {
    return { ...patch, pitchCount: (gs.pitchCount ?? 0) + 1 };
}

/** Merge batter AB into existing batterStats. */
function addAB(gs: GameState, batterId?: string | null): Partial<GameState> {
    if (!batterId) return {};
    const prev = gs.batterStats?.[batterId] ?? { ab: 0, hits: 0 };
    return { batterStats: { ...gs.batterStats, [batterId]: { ...prev, ab: prev.ab + 1 } } };
}

/** Merge batter Hit into existing batterStats. */
function addHit(gs: GameState, batterId?: string | null): Partial<GameState> {
    if (!batterId) return {};
    const prev = gs.batterStats?.[batterId] ?? { ab: 0, hits: 0 };
    return { batterStats: { ...gs.batterStats, [batterId]: { ab: prev.ab + 1, hits: prev.hits + 1 } } };
}

export function applyBall(gs: GameState): Partial<GameState> {
    if (gs.balls >= 3) {
        // Walk - advance all forced runners
        return applyWalk(gs);
    }
    return withPitch({ balls: gs.balls + 1, lastPlay: 'Ball' }, gs);
}

export function applyStrike(gs: GameState, batterId?: string | null): Partial<GameState> {
    if (gs.strikes >= 2) {
        return applyOut(gs, 'Strikeout K (Swinging)', batterId);
    }
    return withPitch({ strikes: gs.strikes + 1, lastPlay: 'Strike' }, gs);
}

export function applyFoul(gs: GameState): Partial<GameState> {
    // Foul - can't strikeout on foul (count stays at 2 max)
    const newStrikes = gs.strikes < 2 ? gs.strikes + 1 : 2;
    return withPitch({ strikes: newStrikes, lastPlay: 'Foul Ball' }, gs);
}

export function applyOut(gs: GameState, description = 'Out', batterId?: string | null): Partial<GameState> {
    const newOuts = gs.outs + 1;
    const abPatch = addAB(gs, batterId);

    if (newOuts >= 3) {
        // End of half-inning — flip sides, reset count + bases + pitch count
        const isTopInning = !gs.isTopInning;
        const newInning = !gs.isTopInning ? gs.inning + 1 : gs.inning;
        return {
            ...abPatch,
            outs: 0, balls: 0, strikes: 0, pitchCount: 0,
            onFirst: false, onSecond: false, onThird: false,
            isTopInning,
            inning: newInning,
            lastPlay: `${description} — 3 Outs, side retired`,
        };
    }
    return withPitch({ ...abPatch, outs: newOuts, balls: 0, strikes: 0, lastPlay: description }, gs);
}

export function applyHit(gs: GameState, bases: 1 | 2 | 3 | 4, batterId?: string | null): Partial<GameState> {
    const battingTeam = gs.isTopInning ? 'awayTeam' : 'homeTeam';
    const currentHits = gs[battingTeam].hits;
    const hitLabel = ['Single', 'Double', 'Triple', 'Home Run'][bases - 1];

    let { onFirst, onSecond, onThird, homeTeam, awayTeam } = gs;
    let runsScored = 0;

    if (bases === 4) {
        // Home run — batter + all on base score
        runsScored = 1 + (onFirst ? 1 : 0) + (onSecond ? 1 : 0) + (onThird ? 1 : 0);
        onFirst = false; onSecond = false; onThird = false;
    } else if (bases === 3) {
        // Triple — all runners score, batter to 3rd
        runsScored = (onFirst ? 1 : 0) + (onSecond ? 1 : 0) + (onThird ? 1 : 0);
        onFirst = false; onSecond = false; onThird = true;
    } else if (bases === 2) {
        // Double — runners advance 2: 1st→3rd, 2nd→home, 3rd→home
        runsScored = (onSecond ? 1 : 0) + (onThird ? 1 : 0);
        onThird = onFirst;   // runner on 1st goes to 3rd
        onFirst = false;
        onSecond = true;     // batter to 2nd
    } else {
        // Single — runners advance 1: 1st→2nd, 2nd→3rd, 3rd→home
        runsScored = (onThird ? 1 : 0);
        onThird = onSecond;
        onSecond = onFirst;
        onFirst = true;      // batter to 1st
    }

    if (battingTeam === 'homeTeam') {
        homeTeam = { ...homeTeam, score: homeTeam.score + runsScored, hits: currentHits + 1 };
    } else {
        awayTeam = { ...awayTeam, score: awayTeam.score + runsScored, hits: currentHits + 1 };
    }

    const hitPatch = addHit(gs, batterId);

    return withPitch({
        ...hitPatch,
        homeTeam, awayTeam,
        onFirst, onSecond, onThird,
        balls: 0, strikes: 0,
        lastPlay: `${hitLabel}${runsScored > 0 ? ` — ${runsScored} Run${runsScored > 1 ? 's' : ''} Scored` : ''}`,
    }, gs);
}

/** Called strike (batter did not swing). Counts toward strikeout. */
export function applyCalledStrike(gs: GameState, batterId?: string | null): Partial<GameState> {
    if (gs.strikes >= 2) return applyOut(gs, 'Strikeout ꓘ (Called)', batterId);
    return withPitch({ strikes: gs.strikes + 1, lastPlay: 'Called Strike' }, gs);
}

/** Swinging strike. Counts toward strikeout. */
export function applySwingingStrike(gs: GameState, batterId?: string | null): Partial<GameState> {
    if (gs.strikes >= 2) return applyOut(gs, 'Strikeout K (Swinging)', batterId);
    return withPitch({ strikes: gs.strikes + 1, lastPlay: 'Swinging Strike' }, gs);
}


export function applyWalk(gs: GameState): Partial<GameState> {
    const battingTeam = gs.isTopInning ? 'awayTeam' : 'homeTeam';
    let { onFirst, onSecond, onThird, homeTeam, awayTeam } = gs;
    let runsScored = 0;

    // Force advance
    if (onFirst && onSecond && onThird) {
        runsScored = 1;
        if (battingTeam === 'homeTeam') {
            homeTeam = { ...homeTeam, score: homeTeam.score + 1 };
        } else {
            awayTeam = { ...awayTeam, score: awayTeam.score + 1 };
        }
    } else if (onFirst && onSecond) {
        onThird = true;
    } else if (onFirst) {
        onSecond = true;
    }
    onFirst = true;

    return withPitch({
        homeTeam, awayTeam,
        onFirst, onSecond, onThird,
        balls: 0, strikes: 0,
        lastPlay: `Walk${runsScored > 0 ? ' — Run Forced In' : ''}`,
    }, gs);
}

export function scoreRun(gs: GameState): Partial<GameState> {
    const battingTeam = gs.isTopInning ? 'awayTeam' : 'homeTeam';
    if (battingTeam === 'homeTeam') {
        return { homeTeam: { ...gs.homeTeam, score: gs.homeTeam.score + 1 }, lastPlay: 'Run Scored' };
    }
    return { awayTeam: { ...gs.awayTeam, score: gs.awayTeam.score + 1 }, lastPlay: 'Run Scored' };
}

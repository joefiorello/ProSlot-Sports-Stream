// ─── Stream / Game Types ─────────────────────────────────────────────────────

// ─── Roster ───────────────────────────────────────────────────────────────────

export interface Player {
    id: string;         // uuid generated client-side
    name: string;
    number: string;     // jersey number (string to allow "00")
    position?: string;  // e.g. "P", "C", "1B"
    order: number;      // batting order index (0-based)
}

// ─── Play-by-Play ─────────────────────────────────────────────────────────────

export type PitchType = 'Fastball' | 'Curveball' | 'Changeup' | 'Slider' | 'Other';

export type PlayResult =
    | 'Ball' | 'Strike' | 'Foul'
    | 'Single' | 'Double' | 'Triple' | 'Home Run'
    | 'Out' | 'Strikeout'
    | 'Walk'
    | 'Run Scored'
    | string; // catch-all for custom descriptions

export interface PlayEvent {
    id?: string;        // Firestore doc id (set after creation)
    inning: number;
    isTopInning: boolean;
    pitchType?: PitchType;
    result: PlayResult;
    batterName?: string;
    pitcherName?: string;
    onFirst: boolean;
    onSecond: boolean;
    onThird: boolean;
    prevGameState?: Record<string, unknown>; // full game state snapshot before this play
    timestamp: unknown; // serverTimestamp()
}

export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'archived';

export interface Game {
    id: string;
    orgId: string;
    title: string;
    homeTeam: string;
    awayTeam: string;
    scheduledAt: string; // ISO
    status: StreamStatus;
    streamCode: string; // 6-character join code
    viewerCount?: number;
    roomName: string; // LiveKit room name
    hlsUrl?: string; // Playback HLS URL
    recordingPath?: string; // Storage path
    expiresAt?: string; // ISO — 24hr after stream ends
    score?: { home: number; away: number };
    createdBy: string;
    createdAt: string;
}

export interface Clip {
    id: string;
    gameId: string;
    orgId: string;
    title: string;
    startTime: number; // seconds from stream start
    endTime: number;
    url?: string;
    createdBy: string;
    createdAt: string;
    status: 'processing' | 'ready' | 'failed';
}

// ─── Camera / Publisher ───────────────────────────────────────────────────────

export type CameraAngle = 'main' | 'plate' | 'firstbase' | 'dugout' | 'outfield' | 'custom';

export interface Publisher {
    participantId: string;
    displayName: string;
    angle: CameraAngle;
    isActive: boolean;
}

// ─── API Payloads ─────────────────────────────────────────────────────────────

export interface CreateGamePayload {
    title: string;
    homeTeam: string;
    awayTeam: string;
    sport: string;
    scheduledAt: string;
    orgId: string;
    userId: string;
}

export interface CreateTokenPayload {
    roomName: string;
    participantName: string;
    role: 'publisher' | 'viewer';
    angle?: CameraAngle;
}

export interface CreateClipPayload {
    gameId: string;
    title: string;
    startTime: number;
    endTime: number;
    orgId: string;
    userId: string;
}

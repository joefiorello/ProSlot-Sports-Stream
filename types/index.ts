// ─── Stream / Game Types ─────────────────────────────────────────────────────

export type StreamStatus = 'scheduled' | 'live' | 'ended' | 'archived';

export interface Game {
    id: string;
    orgId: string;
    title: string;
    homeTeam: string;
    awayTeam: string;
    sport: string;
    scheduledAt: string; // ISO
    status: StreamStatus;
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

// LiveKit client-side helpers

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.livekit.cloud';

export async function fetchToken(params: {
    roomName: string;
    participantName: string;
    role: 'publisher' | 'viewer';
    angle?: string;
}): Promise<string> {
    const res = await fetch('/api/stream/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to get stream token');
    const data = await res.json();
    return data.token;
}

export async function createStreamRoom(payload: {
    gameId: string;
    title: string;
    orgId: string;
}): Promise<{ roomName: string }> {
    const res = await fetch('/api/stream/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create stream room');
    return res.json();
}

export async function requestClip(payload: {
    gameId: string;
    title: string;
    startTime: number;
    endTime: number;
    orgId: string;
}): Promise<{ clipId: string }> {
    const res = await fetch('/api/stream/clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create clip');
    return res.json();
}

export function formatDuration(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

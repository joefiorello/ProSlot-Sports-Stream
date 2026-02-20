// LiveKit client-side helpers

export const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.livekit.cloud';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchToken(params: {
    roomName: string;
    participantName: string;
    role: 'publisher' | 'viewer';
    angle?: string;
}): Promise<{ token: string; sessionId: string | null }> {
    const res = await fetch(`${API_BASE}/api/stream/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
    });
    if (!res.ok) throw new Error('Failed to get stream token');
    const data = await res.json();
    return { token: data.token, sessionId: data.sessionId || null };
}

/** End a tracked session. Uses sendBeacon for reliability during page unload. */
export function endSession(sessionId: string | null): void {
    if (!sessionId) return;
    const url = `${API_BASE}/api/stream/end-session`;
    const body = JSON.stringify({ sessionId });

    // Prefer sendBeacon — works reliably during beforeunload
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
    } else {
        // Fallback
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => { });
    }
}

export async function createStreamRoom(payload: {
    gameId: string;
    title: string;
    orgId: string;
}): Promise<{ roomName: string }> {
    const res = await fetch(`${API_BASE}/api/stream/create`, {
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
    const res = await fetch(`${API_BASE}/api/stream/clip`, {
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


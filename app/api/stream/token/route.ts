import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import type { CreateTokenPayload } from '@/types';

export async function POST(req: NextRequest) {
    try {
        const body: CreateTokenPayload = await req.json();
        const { roomName, participantName, role, angle } = body;

        if (!roomName || !participantName || !role) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;

        if (!apiKey || !apiSecret) {
            return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 });
        }

        const at = new AccessToken(apiKey, apiSecret, {
            identity: participantName,
            name: angle ? `${participantName} (${angle})` : participantName,
            ttl: role === 'publisher' ? '6h' : '4h',
        });

        if (role === 'publisher') {
            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: true,
                canSubscribe: true,
                canPublishData: true,
            });
        } else {
            at.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: false,
                canSubscribe: true,
            });
        }

        const token = await at.toJwt();
        return NextResponse.json({ token });
    } catch (error) {
        console.error('[token] Error generating token:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

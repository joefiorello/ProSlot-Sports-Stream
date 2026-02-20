import { NextRequest, NextResponse } from 'next/server';
import { RoomServiceClient } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
    try {
        const { gameId, title, orgId } = await req.json();

        if (!gameId || !orgId) {
            return NextResponse.json({ error: 'Missing gameId or orgId' }, { status: 400 });
        }

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const livekitHost = process.env.LIVEKIT_HOST || '';

        if (!apiKey || !apiSecret || !livekitHost) {
            return NextResponse.json({ error: 'LiveKit credentials not configured' }, { status: 500 });
        }

        const roomName = `${orgId}-${gameId}-${Date.now()}`;

        const roomService = new RoomServiceClient(livekitHost, apiKey, apiSecret);
        await roomService.createRoom({
            name: roomName,
            emptyTimeout: 300, // 5 min before room auto-closes when empty
            maxParticipants: 20,
            metadata: JSON.stringify({ gameId, orgId, title }),
        });

        return NextResponse.json({ roomName });
    } catch (error) {
        console.error('[create] Error creating room:', error);
        return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
    }
}

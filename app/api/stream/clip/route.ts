import { NextRequest, NextResponse } from 'next/server';
import { createClip } from '@/lib/db';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { gameId, title, startTime, endTime, orgId, userId } = body;

        if (!gameId || !orgId || startTime === undefined || endTime === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (endTime - startTime < 3) {
            return NextResponse.json({ error: 'Clip must be at least 3 seconds' }, { status: 400 });
        }

        if (endTime - startTime > 300) {
            return NextResponse.json({ error: 'Clip cannot exceed 5 minutes' }, { status: 400 });
        }

        const clipId = await createClip({
            gameId,
            title: title || `Clip at ${new Date().toLocaleTimeString()}`,
            startTime,
            endTime,
            orgId,
            userId: userId || 'anonymous',
        });

        // In production: trigger a Cloud Run job / Cloud Function here
        // to extract the clip from the recording using FFmpeg:
        //   ffmpeg -i {recordingUrl} -ss {startTime} -to {endTime} -c copy {outputPath}
        // Then update the clip document with the resulting URL.

        return NextResponse.json({ clipId, status: 'processing' });
    } catch (error) {
        console.error('[clip] Error creating clip:', error);
        return NextResponse.json({ error: 'Failed to queue clip' }, { status: 500 });
    }
}

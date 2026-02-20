import type { Metadata } from 'next';
import './globals.css';
import '@livekit/components-styles';
import { Providers } from './providers';

export const metadata: Metadata = {
    title: 'ProSlot Sports Stream',
    description: 'Live multi-angle youth sports streaming. Stream any game, from any angle, on any device.',
    keywords: ['youth baseball', 'live sports streaming', 'multi-angle', 'GameChanger alternative'],
    openGraph: {
        title: 'ProSlot Sports Stream',
        description: 'Live multi-angle youth sports streaming.',
        type: 'website',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-[#0a0f1a] text-white antialiased">
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}


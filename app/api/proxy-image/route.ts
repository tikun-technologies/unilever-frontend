import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Backend proxy for external images (CORS + optional resize for UI).
 * Query params:
 *   url  - source image URL (required)
 *   w    - max width in px (optional, enables resize)
 *   q    - quality 1-100 (default 82)
 *   fmt  - webp | jpeg | png (default webp when resizing)
 */

const MAX_WIDTH = 3840;
const CACHE_ORIGINAL = 'public, max-age=86400';
const CACHE_OPTIMIZED = 'public, max-age=604800, immutable';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
        return new NextResponse('Missing url parameter', { status: 400 });
    }

    try {
        const decodedUrl = decodeURIComponent(imageUrl);
        const targetUrl = new URL(decodedUrl);

        const allowedDomains = [
            'res.cloudinary.com',
            'blob.core.windows.net',
            'lh3.googleusercontent.com',
        ];

        const isAllowed = allowedDomains.some(domain =>
            targetUrl.hostname.endsWith(domain)
        );

        if (!isAllowed) {
            // Allow but could restrict in production
        }

        const response = await fetch(decodedUrl, {
            method: 'GET',
            cache: 'force-cache',
        });

        if (!response.ok) {
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const sourceBuffer = Buffer.from(await response.arrayBuffer());

        const toResponseBody = (buffer: Buffer) => new Uint8Array(buffer);
        const widthParam = searchParams.get('w');
        const requestedWidth = widthParam ? Number.parseInt(widthParam, 10) : 0;

        if (!requestedWidth || Number.isNaN(requestedWidth) || requestedWidth < 1 || requestedWidth > MAX_WIDTH) {
            const contentType = response.headers.get('content-type') || 'image/png';
            return new NextResponse(toResponseBody(sourceBuffer), {
                headers: {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': CACHE_ORIGINAL,
                },
            });
        }

        const qualityRaw = searchParams.get('q');
        const quality = Math.min(100, Math.max(1, Number.parseInt(qualityRaw || '82', 10) || 82));
        const fmt = (searchParams.get('fmt') || 'webp').toLowerCase();

        try {
            const pipeline = sharp(sourceBuffer, { failOn: 'none' }).rotate().resize({
                width: requestedWidth,
                withoutEnlargement: true,
            });

            let outputBuffer: Buffer;
            let contentType: string;

            if (fmt === 'jpeg' || fmt === 'jpg') {
                outputBuffer = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
                contentType = 'image/jpeg';
            } else if (fmt === 'png') {
                outputBuffer = await pipeline.png({ compressionLevel: 9 }).toBuffer();
                contentType = 'image/png';
            } else {
                outputBuffer = await pipeline.webp({ quality }).toBuffer();
                contentType = 'image/webp';
            }

            return new NextResponse(toResponseBody(outputBuffer), {
                headers: {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': CACHE_OPTIMIZED,
                },
            });
        } catch (resizeError) {
            console.warn('Image resize failed, returning original bytes', resizeError);
            const contentType = response.headers.get('content-type') || 'image/png';
            return new NextResponse(toResponseBody(sourceBuffer), {
                headers: {
                    'Content-Type': contentType,
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': CACHE_ORIGINAL,
                },
            });
        }
    } catch (error) {
        console.error('Image proxy error:', error);
        return new NextResponse('Error proxying image', { status: 500 });
    }
}

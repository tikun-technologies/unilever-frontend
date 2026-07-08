import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

/**
 * Backend proxy for external images (CORS + optional resize for UI).
 * Query params:
 *   url  - source image URL (required)
 *   w    - max width in px (optional, enables resize)
 *   q    - quality 1-100 (default 82)
 *   fmt  - webp | jpeg | png (default webp when resizing)
 *
 * Overload protection (single 8GB host, CDN may or may not be in front):
 *   1. Request coalescing (single-flight): concurrent requests for the SAME
 *      url+w+q+fmt share one fetch+transcode instead of each running their own.
 *      Kills the "10 respondents open a fresh study at once" cold-start stampede.
 *   2. Concurrency cap: at most MAX_CONCURRENT_TRANSCODES sharp operations run
 *      at any moment; the rest queue. Bounds peak RAM/CPU so a burst of DISTINCT
 *      cold images can't OOM the box. sharp is CPU-bound, so on a 1-2 vCPU host
 *      this cap costs ~nothing in wall-clock (extra concurrency just time-slices)
 *      while keeping memory bounded.
 *
 * NOTE: this state is per Node process. On a single instance it fully protects
 * the box; if App Service ever scales to multiple instances each gets its own
 * cap/dedup (still bounded per-instance, just not coordinated).
 */

const MAX_WIDTH = 3840;
const CACHE_ORIGINAL = 'public, max-age=86400';
const CACHE_OPTIMIZED = 'public, max-age=604800, immutable';

// --- Concurrency cap for sharp transcodes ---------------------------------
const MAX_CONCURRENT_TRANSCODES = 4;
let activeTranscodes = 0;
const transcodeWaiters: Array<() => void> = [];

function acquireTranscodeSlot(): Promise<void> {
    if (activeTranscodes < MAX_CONCURRENT_TRANSCODES) {
        activeTranscodes++;
        return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
        transcodeWaiters.push(() => {
            activeTranscodes++;
            resolve();
        });
    });
}

function releaseTranscodeSlot(): void {
    activeTranscodes--;
    const next = transcodeWaiters.shift();
    if (next) next();
}

// --- Request coalescing (single-flight) -----------------------------------
type ProcessResult = {
    status: number;
    body: Uint8Array;
    contentType: string;
    cacheControl?: string;
};

// Holds only IN-FLIGHT work; entries are deleted as soon as the promise settles,
// so this never grows into an unbounded in-memory image cache.
const inFlight = new Map<string, Promise<ProcessResult>>();

async function processImage(
    decodedUrl: string,
    requestedWidth: number,
    quality: number,
    fmt: string,
): Promise<ProcessResult> {
    const response = await fetch(decodedUrl, {
        method: 'GET',
        cache: 'force-cache',
    });

    if (!response.ok) {
        return {
            status: response.status,
            body: new TextEncoder().encode(`Failed to fetch image: ${response.statusText}`),
            contentType: 'text/plain',
        };
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    const toResponseBody = (buffer: Buffer) => new Uint8Array(buffer);

    // requestedWidth === 0 means "no valid resize requested" -> passthrough.
    if (!requestedWidth) {
        const contentType = response.headers.get('content-type') || 'image/png';
        return {
            status: 200,
            body: toResponseBody(sourceBuffer),
            contentType,
            cacheControl: CACHE_ORIGINAL,
        };
    }

    // Only the CPU-heavy transcode is gated by the concurrency cap.
    await acquireTranscodeSlot();
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

        return {
            status: 200,
            body: toResponseBody(outputBuffer),
            contentType,
            cacheControl: CACHE_OPTIMIZED,
        };
    } catch (resizeError) {
        console.warn('Image resize failed, returning original bytes', resizeError);
        const contentType = response.headers.get('content-type') || 'image/png';
        return {
            status: 200,
            body: toResponseBody(sourceBuffer),
            contentType,
            cacheControl: CACHE_ORIGINAL,
        };
    } finally {
        releaseTranscodeSlot();
    }
}

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

        // Normalize params up front so the coalescing key is stable and the
        // width validation matches the original passthrough behavior.
        const widthParam = searchParams.get('w');
        const parsedWidth = widthParam ? Number.parseInt(widthParam, 10) : 0;
        const requestedWidth =
            !parsedWidth || Number.isNaN(parsedWidth) || parsedWidth < 1 || parsedWidth > MAX_WIDTH
                ? 0
                : parsedWidth;
        const qualityRaw = searchParams.get('q');
        const quality = Math.min(100, Math.max(1, Number.parseInt(qualityRaw || '82', 10) || 82));
        const fmt = (searchParams.get('fmt') || 'webp').toLowerCase();

        // Single-flight: identical concurrent requests await one shared job.
        const key = `${decodedUrl}|${requestedWidth}|${quality}|${fmt}`;
        let job = inFlight.get(key);
        if (!job) {
            job = processImage(decodedUrl, requestedWidth, quality, fmt);
            inFlight.set(key, job);
            job.finally(() => {
                if (inFlight.get(key) === job) inFlight.delete(key);
            });
        }

        const result = await job;

        const headers: Record<string, string> = {
            'Content-Type': result.contentType,
            'Access-Control-Allow-Origin': '*',
        };
        if (result.cacheControl) headers['Cache-Control'] = result.cacheControl;

        return new NextResponse(result.body as unknown as BodyInit, {
            status: result.status,
            headers,
        });
    } catch (error) {
        console.error('Image proxy error:', error);
        return new NextResponse('Error proxying image', { status: 500 });
    }
}

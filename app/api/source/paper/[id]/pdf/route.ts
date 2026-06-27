import { NextRequest } from 'next/server';
import { loadPaperSource, resolvePdfUrl } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const source = await loadPaperSource(id);
  if (!source) {
    return new Response('Paper source not found', { status: 404 });
  }

  const resolution = await resolvePdfUrl(source);
  if (!resolution.pdfUrl) {
    return new Response('Open PDF not available', { status: 404 });
  }

  const upstream = await fetch(resolution.pdfUrl, {
    redirect: 'follow',
    headers: {
      Accept: 'application/pdf,*/*;q=0.8',
      'User-Agent': 'ai-person-agent/0.5.0 paper-source-workspace',
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (!upstream.ok) {
    return new Response(`PDF fetch failed: ${upstream.status}`, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  if (!hasPdfHeader(body)) {
    return new Response('Resolved URL did not return a PDF', { status: 502 });
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/pdf',
      'Content-Length': String(body.byteLength),
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Paper-Pdf-Source': resolution.source,
    },
  });
}

function hasPdfHeader(body: ArrayBuffer): boolean {
  const bytes = new Uint8Array(body.slice(0, 1024));
  for (let index = 0; index <= bytes.length - 5; index += 1) {
    if (
      bytes[index] === 0x25 &&
      bytes[index + 1] === 0x50 &&
      bytes[index + 2] === 0x44 &&
      bytes[index + 3] === 0x46 &&
      bytes[index + 4] === 0x2d
    ) {
      return true;
    }
  }
  return false;
}

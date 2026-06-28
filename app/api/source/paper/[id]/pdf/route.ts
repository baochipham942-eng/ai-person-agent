import { NextRequest } from 'next/server';
import { loadPaperSource, resolvePdfUrl } from '@/lib/paper-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
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

  // 透传客户端 Range：PDF.js 用 URL 加载会做分段请求，arxiv 支持 Range，
  // 只取首页所需的几百 KB 即可渲染，避免整包 ~18MB 下完才出第一页。
  const range = request.headers.get('range');
  const upstream = await fetch(resolution.pdfUrl, {
    redirect: 'follow',
    headers: {
      Accept: 'application/pdf,*/*;q=0.8',
      'User-Agent': 'ai-person-agent/0.5.0 paper-source-workspace',
      ...(range ? { Range: range } : {}),
    },
    signal: AbortSignal.timeout(120_000),
  });

  if (upstream.status !== 200 && upstream.status !== 206) {
    return new Response(`PDF fetch failed: ${upstream.status}`, { status: 502 });
  }

  const upstreamType = upstream.headers.get('content-type') || 'application/pdf';
  if (upstreamType.startsWith('text/html')) {
    return new Response('Resolved URL did not return a PDF', { status: 502 });
  }

  const headers = new Headers();
  headers.set(
    'Content-Type',
    upstreamType.includes('pdf') || upstreamType.includes('octet-stream') ? upstreamType : 'application/pdf',
  );
  headers.set('Accept-Ranges', 'bytes');
  headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  headers.set('X-Paper-Pdf-Source', resolution.source);
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);
  const contentRange = upstream.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);

  // 流式透传上游响应体，服务端不再 buffer 整个 PDF。
  return new Response(upstream.body, { status: upstream.status, headers });
}

/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TARGET_HOST = 'ai-person-agent.vercel.app';

const CONTENT_TYPES = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

function serveStaticFile(req, res, urlPath) {
    let filePath = path.join(__dirname, 'public', urlPath);

    // Handle directory requests - serve index.html
    if (urlPath.endsWith('/')) {
        filePath = path.join(filePath, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            console.error('File not found:', filePath);
            res.writeHead(404);
            res.end('Not Found');
        } else {
            const ext = path.extname(filePath).toLowerCase();
            const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
}

// 把请求原样转发到 Vercel（默认行为，PDF 缓存出错也退回到这里）。
function proxyToUpstream(req, res) {
    const options = {
        hostname: TARGET_HOST,
        port: 443,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: TARGET_HOST,
            'x-forwarded-host': req.headers.host || 'people.llmxy.xyz',
            'x-forwarded-proto': 'https',
            'accept-encoding': 'identity', // Disable compression from Vercel
        },
    };
    delete options.headers['connection'];

    const proxyReq = https.request(options, (proxyRes) => {
        const headers = { ...proxyRes.headers };
        delete headers['transfer-encoding'];
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
            res.end('Bad Gateway: ' + err.message);
        } else {
            res.end();
        }
    });

    req.pipe(proxyReq, { end: true });
}

// ---- Paper PDF 本地缓存（SG 层）----
// 大 PDF（图像密集论文常 ~18MB）每个 range 请求都穿 China→FC→Vercel→arxiv 太慢。
// 在 FC(SG) 本地 /tmp 缓存整篇 PDF，range 从本地文件切片返回（China→SG 一跳）。
// 任何异常都 fall through 到 proxyToUpstream，绝不影响其它流量。
const PDF_PATH_RE = /^\/api\/source\/paper\/[^/]+\/pdf$/;
const PDF_CACHE_DIR = '/tmp/paper-pdf';
const PDF_CACHE_MAX_BYTES = 250 * 1024 * 1024; // /tmp 上限保守 250MB
const pdfInflight = new Set();

function pdfCacheKey(urlPath) {
    return crypto.createHash('sha1').update(urlPath).digest('hex');
}

function prunePdfCache() {
    try {
        const entries = fs.readdirSync(PDF_CACHE_DIR)
            .filter(f => f.endsWith('.pdf'))
            .map(f => {
                const st = fs.statSync(path.join(PDF_CACHE_DIR, f));
                return { f, size: st.size, mtime: st.mtimeMs };
            });
        let total = entries.reduce((sum, e) => sum + e.size, 0);
        if (total <= PDF_CACHE_MAX_BYTES) return;
        entries.sort((a, b) => a.mtime - b.mtime); // 最旧先删
        for (const e of entries) {
            if (total <= PDF_CACHE_MAX_BYTES) break;
            const base = e.f.replace(/\.pdf$/, '');
            try { fs.unlinkSync(path.join(PDF_CACHE_DIR, base + '.pdf')); } catch {}
            try { fs.unlinkSync(path.join(PDF_CACHE_DIR, base + '.json')); } catch {}
            total -= e.size;
        }
    } catch (e) {
        console.error('prunePdfCache:', e && e.message);
    }
}

function serveFromPdfCache(req, res, file, meta) {
    const total = meta.length;
    const range = req.headers['range'];
    const baseHeaders = {
        'Content-Type': meta.contentType || 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=86400',
        'X-Paper-Pdf-Cache': 'sg-hit',
    };
    if (range) {
        const m = /bytes=(\d*)-(\d*)/.exec(range);
        let start = m && m[1] ? parseInt(m[1], 10) : 0;
        let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
        if (isNaN(start) || start < 0) start = 0;
        if (isNaN(end) || end >= total) end = total - 1;
        if (start > end) {
            res.writeHead(416, { 'Content-Range': `bytes */${total}` });
            res.end();
            return;
        }
        res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Content-Length': String(end - start + 1),
        });
        fs.createReadStream(file, { start, end }).pipe(res);
    } else {
        res.writeHead(200, { ...baseHeaders, 'Content-Length': String(total) });
        fs.createReadStream(file).pipe(res);
    }
}

function fetchPdfToCache(urlPath, file, meta) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: TARGET_HOST,
            port: 443,
            path: urlPath,
            method: 'GET',
            headers: { host: TARGET_HOST, 'x-forwarded-proto': 'https', 'accept-encoding': 'identity' },
        };
        const upReq = https.request(options, (upRes) => {
            if (upRes.statusCode !== 200) {
                upRes.resume();
                reject(new Error('upstream ' + upRes.statusCode));
                return;
            }
            const tmp = file + '.tmp-' + process.pid + '-' + Date.now();
            const ws = fs.createWriteStream(tmp);
            upRes.pipe(ws);
            ws.on('finish', () => {
                try {
                    const size = fs.statSync(tmp).size;
                    fs.renameSync(tmp, file);
                    fs.writeFileSync(meta, JSON.stringify({
                        length: size,
                        contentType: upRes.headers['content-type'] || 'application/pdf',
                    }));
                    resolve();
                } catch (e) {
                    try { fs.unlinkSync(tmp); } catch {}
                    reject(e);
                }
            });
            ws.on('error', (e) => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
        });
        upReq.on('error', reject);
        upReq.setTimeout(120000, () => upReq.destroy(new Error('upstream timeout')));
        upReq.end();
    });
}

async function handlePdfCache(req, res, urlPath) {
    fs.mkdirSync(PDF_CACHE_DIR, { recursive: true });
    const key = pdfCacheKey(urlPath);
    const file = path.join(PDF_CACHE_DIR, key + '.pdf');
    const meta = path.join(PDF_CACHE_DIR, key + '.json');

    const readMeta = () => JSON.parse(fs.readFileSync(meta, 'utf8'));

    if (fs.existsSync(file) && fs.existsSync(meta)) {
        serveFromPdfCache(req, res, file, readMeta());
        return;
    }
    // 在途：等首抓完成（最多 ~40s）
    if (pdfInflight.has(key)) {
        for (let i = 0; i < 160; i++) {
            await new Promise(r => setTimeout(r, 250));
            if (fs.existsSync(file) && fs.existsSync(meta)) {
                serveFromPdfCache(req, res, file, readMeta());
                return;
            }
        }
        throw new Error('pdf cache wait timeout');
    }
    // 首抓
    pdfInflight.add(key);
    try {
        await fetchPdfToCache(urlPath, file, meta);
        prunePdfCache();
    } finally {
        pdfInflight.delete(key);
    }
    serveFromPdfCache(req, res, file, readMeta());
}

const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];

    // Serve all avatars locally (manual + seed)
    if (urlPath.startsWith('/avatars/')) {
        serveStaticFile(req, res, urlPath);
        return;
    }

    // Paper PDF：走 SG 本地缓存；任何异常都退回实时代理，绝不影响其它路径
    if (req.method === 'GET' && PDF_PATH_RE.test(urlPath)) {
        handlePdfCache(req, res, urlPath).catch((err) => {
            console.error('pdf cache fallthrough:', err && err.message);
            if (!res.headersSent) {
                proxyToUpstream(req, res);
            } else {
                try { res.end(); } catch {}
            }
        });
        return;
    }

    proxyToUpstream(req, res);
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on port ${PORT}, forwarding to ${TARGET_HOST}`);
});

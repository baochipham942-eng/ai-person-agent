/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const https = require('https');

const TARGET_HOST = 'ai-person-agent.vercel.app';

const fs = require('fs');
const path = require('path');

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

const server = http.createServer((req, res) => {
    // Parse URL to handle query strings
    const urlPath = req.url.split('?')[0];

    // Serve all avatars locally (manual + seed)
    if (urlPath.startsWith('/avatars/')) {
        serveStaticFile(req, res, urlPath);
        return;
    }

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

    // Remove headers that might cause issues
    delete options.headers['connection'];

    const proxyReq = https.request(options, (proxyRes) => {
        // Copy response headers, except encoding
        const headers = { ...proxyRes.headers };
        delete headers['transfer-encoding'];

        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res, { end: true });
    });

    proxyReq.on('error', (err) => {
        console.error('Proxy error:', err);
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad Gateway: ' + err.message);
    });

    // Forward request body
    req.pipe(proxyReq, { end: true });
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Proxy server running on port ${PORT}, forwarding to ${TARGET_HOST}`);
});

const http = require('http');
const https = require('https');
const zlib = require('zlib');

const TARGET_HOST = 'ai-person-agent.vercel.app';

const server = http.createServer((req, res) => {
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

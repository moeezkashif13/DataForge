const http = require('http');
const zlib = require('zlib');

const PORT = process.env.PORT || 3000;
const TARGETS = [
  { host: '127.0.0.1', port: 3001 },
  { host: '127.0.0.1', port: 3002 },
  { host: '127.0.0.1', port: 3003 },
];

let counter = 0;

// High-performance HTTP Keep-Alive Agent for forwarding to local workers
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: Infinity,
  maxFreeSockets: 256,
  timeout: 60000,
});

const server = http.createServer((req, res) => {
  // Strict Round-Robin distribution
  const target = TARGETS[counter % TARGETS.length];
  counter = (counter + 1) % TARGETS.length;

  const options = {
    hostname: target.host,
    port: target.port,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      'x-forwarded-for': req.socket.remoteAddress,
      'x-forwarded-port': PORT,
      'x-forwarded-proto': 'http',
    },
    agent,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    const acceptEncoding = (req.headers['accept-encoding'] || '').toLowerCase();
    const contentType = (proxyRes.headers['content-type'] || '').toLowerCase();
    const isCompressible = contentType.includes('json') || contentType.includes('text');

    if (isCompressible && acceptEncoding.includes('gzip')) {
      const headers = { ...proxyRes.headers, 'content-encoding': 'gzip' };
      delete headers['content-length'];
      res.writeHead(proxyRes.statusCode, headers);
      proxyRes.pipe(zlib.createGzip({ level: 6 })).pipe(res);
    } else {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error(`[Proxy Error] Failed to reach worker on port ${target.port}:`, err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ statusCode: 502, message: 'Bad Gateway: Backend worker unreachable' }));
    }
  });

  req.pipe(proxyReq);
});

// Support WebSocket upgrades for Socket.IO realtime connections
server.on('upgrade', (req, socket, head) => {
  const target = TARGETS[counter % TARGETS.length];
  counter = (counter + 1) % TARGETS.length;

  const proxyReq = http.request({
    hostname: target.host,
    port: target.port,
    path: req.url,
    method: req.method,
    headers: req.headers,
  });

  proxyReq.on('upgrade', (proxyRes, proxySocket, proxyHead) => {
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\n` +
      Object.entries(proxyRes.headers)
        .map(([key, val]) => `${key}: ${val}\r\n`)
        .join('') +
      '\r\n'
    );
    if (proxyHead && proxyHead.length) socket.write(proxyHead);
    proxySocket.pipe(socket);
    socket.pipe(proxySocket);
  });

  proxyReq.on('error', (err) => {
    console.error(`[WebSocket Proxy Error] Failed to upgrade:`, err.message);
    socket.destroy();
  });

  proxyReq.end();
});

// Prevent premature connection resets under heavy load:
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000;   // 66 seconds (must be greater than keepAliveTimeout)
server.maxRequestsPerSocket = 0; // Unlimited requests per persistent connection

server.listen(PORT, '0.0.0.0', 2048, () => {
  console.log(`=======================================================`);
  console.log(`🚀 DataForge Reverse Proxy listening on port ${PORT}`);
  console.log(`   Load balancing across:`);
  TARGETS.forEach((t, i) => console.log(`   - Worker ${i + 1}: http://${t.host}:${t.port}`));
  console.log(`=======================================================`);
});

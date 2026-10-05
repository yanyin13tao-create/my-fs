const { config } = require('./config');

function getCorsHeaders(req) {
  const origin = req.headers.origin;
  const allowOrigin =
    config.allowedOrigins.includes('*') || !origin || config.allowedOrigins.includes(origin)
      ? origin || '*'
      : config.allowedOrigins[0];

  return {
    'Access-Control-Allow-Headers': 'Content-Type, X-File-Name',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Origin': allowOrigin,
  };
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function sendNoContent(res, headers = {}) {
  res.writeHead(204, headers);
  res.end();
}

function readBinaryBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on('data', (chunk) => {
      size += chunk.length;

      if (size > config.maxFileBytes) {
        reject(Object.assign(new Error('File is too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = { getCorsHeaders, readBinaryBody, sendJson, sendNoContent };

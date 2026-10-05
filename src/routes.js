const { getCorsHeaders, readBinaryBody, sendJson, sendNoContent } = require('./http');

function getUploadFileName(req) {
  const header = req.headers['x-file-name'];
  return Array.isArray(header) ? header[0] : header || '';
}

function getFilesPathId(pathname) {
  const match = pathname.match(/^\/files\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function getMetadataPathId(pathname) {
  const match = pathname.match(/^\/metadata\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function createRequestHandler({ filesStore }) {
  return async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const corsHeaders = getCorsHeaders(req);

    try {
      if (req.method === 'OPTIONS') {
        sendNoContent(res, corsHeaders);
        return;
      }

      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
        sendJson(res, 200, {
          message: 'Hello from the Mintea file service!',
          timestamp: new Date().toISOString(),
        }, corsHeaders);
        return;
      }

      if (req.method === 'POST' && url.pathname === '/files') {
        const mimeType = String(req.headers['content-type'] || '').split(';')[0].trim();
        const buffer = await readBinaryBody(req);
        const file = await filesStore.saveFile({
          buffer,
          mimeType,
          originalName: getUploadFileName(req),
        });

        sendJson(res, 201, { file }, corsHeaders);
        return;
      }

      const metadataFileId = getMetadataPathId(url.pathname);
      if (req.method === 'GET' && metadataFileId) {
        const file = await filesStore.getMetadata(metadataFileId);

        if (!file) {
          sendJson(res, 404, { error: 'File not found.' }, corsHeaders);
          return;
        }

        sendJson(res, 200, { file }, corsHeaders);
        return;
      }

      const fileId = getFilesPathId(url.pathname);
      if (req.method === 'GET' && fileId) {
        const result = await filesStore.readFile(fileId);

        if (!result) {
          sendJson(res, 404, { error: 'File not found.' }, corsHeaders);
          return;
        }

        res.writeHead(200, {
          'Content-Type': result.metadata.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Content-Length': result.body.length,
          ...corsHeaders,
        });
        res.end(result.body);
        return;
      }

      sendJson(res, 404, { error: 'Not found.' }, corsHeaders);
    } catch (error) {
      sendJson(res, error.statusCode || 500, {
        error: error.statusCode ? error.message : 'Internal server error.',
      }, corsHeaders);
    }
  };
}

module.exports = { createRequestHandler };

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { config } = require('./config');
const { withDatabase } = require('./db');

const extensionByMimeType = {
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function getMetadataPath(fileId) {
  return path.join(config.storageRoot, `${fileId}.json`);
}

function getFilePath(fileId, extension) {
  return path.join(config.storageRoot, `${fileId}${extension}`);
}

function assertSafeFileId(fileId) {
  if (!/^[a-f0-9-]{36}$/i.test(fileId)) {
    const error = new Error('Invalid file id.');
    error.statusCode = 400;
    throw error;
  }
}

async function ensureStorageRoot() {
  await fs.mkdir(config.storageRoot, { recursive: true });
}

async function initialize() {
  await ensureStorageRoot();

  await withDatabase((pool) =>
    pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id uuid PRIMARY KEY,
        kind text NOT NULL,
        mime_type text NOT NULL,
        original_name text,
        size_bytes integer NOT NULL,
        storage_path text NOT NULL,
        public_url text NOT NULL,
        status text NOT NULL DEFAULT 'uploaded',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `),
  );
}

async function saveMetadata(metadata) {
  const wroteToDatabase = await withDatabase(async (pool) => {
    await pool.query(
      `
        INSERT INTO files (
          id,
          kind,
          mime_type,
          original_name,
          size_bytes,
          storage_path,
          public_url,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded', $8)
      `,
      [
        metadata.id,
        metadata.kind,
        metadata.mimeType,
        metadata.originalName,
        metadata.sizeBytes,
        metadata.path,
        metadata.url,
        metadata.createdAt,
      ],
    );
    return true;
  });

  if (!wroteToDatabase) {
    await fs.writeFile(getMetadataPath(metadata.id), JSON.stringify(metadata, null, 2), { flag: 'wx' });
  }
}

async function saveFile({ buffer, mimeType, originalName }) {
  if (!config.allowedImageMimeTypes.includes(mimeType)) {
    const error = new Error('Unsupported image type.');
    error.statusCode = 415;
    throw error;
  }

  if (!buffer.length) {
    const error = new Error('File body is required.');
    error.statusCode = 400;
    throw error;
  }

  await ensureStorageRoot();

  const id = randomUUID();
  const extension = extensionByMimeType[mimeType] || '';
  const filePath = getFilePath(id, extension);
  const metadata = {
    id,
    kind: 'image',
    mimeType,
    originalName,
    sizeBytes: buffer.length,
    path: `${id}${extension}`,
    url: `${config.publicBaseUrl}/files/${id}`,
    createdAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, buffer, { flag: 'wx' });
  await saveMetadata(metadata);

  return metadata;
}

async function getMetadata(fileId) {
  assertSafeFileId(fileId);

  const databaseMetadata = await withDatabase(async (pool) => {
    const result = await pool.query(
      `
        SELECT
          id,
          kind,
          mime_type,
          original_name,
          size_bytes,
          storage_path,
          public_url,
          created_at
        FROM files
        WHERE id = $1 AND status <> 'deleted'
      `,
      [fileId],
    );
    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      kind: row.kind,
      mimeType: row.mime_type,
      originalName: row.original_name,
      sizeBytes: row.size_bytes,
      path: row.storage_path,
      url: row.public_url,
      createdAt: row.created_at.toISOString(),
    };
  });

  if (databaseMetadata) {
    return databaseMetadata;
  }

  try {
    return JSON.parse(await fs.readFile(getMetadataPath(fileId), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function readFile(fileId) {
  const metadata = await getMetadata(fileId);

  if (!metadata) {
    return null;
  }

  const body = await fs.readFile(path.join(config.storageRoot, metadata.path));
  return { body, metadata };
}

module.exports = { getMetadata, initialize, readFile, saveFile };

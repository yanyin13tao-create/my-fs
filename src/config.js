const path = require('node:path');

const config = {
  host: '0.0.0.0',
  port: Number(process.env.PORT ?? 4000),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:4000',
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  awsRegion: process.env.AWS_REGION || 'us-east-2',
  dbHost: process.env.DB_HOST || '',
  dbName: process.env.DB_NAME || '',
  dbPoolSize: Number(process.env.DB_POOL_SIZE ?? 5),
  dbPort: Number(process.env.DB_PORT || 5432),
  dbSecretId: process.env.DB_SECRET_ID || '',
  dbSsl: process.env.DB_SSL !== 'false',
  storageRoot: process.env.FILES_ROOT || path.resolve(__dirname, '..', 'storage'),
  maxFileBytes: Number(process.env.MAX_FILE_BYTES ?? 5 * 1024 * 1024),
  allowedImageMimeTypes: (process.env.ALLOWED_IMAGE_MIME_TYPES || 'image/jpeg,image/png,image/webp,image/gif')
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean),
};

module.exports = { config };

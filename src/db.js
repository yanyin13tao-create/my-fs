const { Pool } = require('pg');
const { config } = require('./config');
const { getDatabaseSecret } = require('./secrets');

let poolPromise = null;

async function createPool() {
  const secret = await getDatabaseSecret();

  if (!secret) {
    return null;
  }

  return new Pool({
    host: config.dbHost || secret.host,
    port: config.dbPort || Number(secret.port || 5432),
    database: config.dbName || secret.dbname || secret.database || 'postgres',
    user: secret.username,
    password: secret.password,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : false,
    max: config.dbPoolSize,
  });
}

function getPool() {
  if (!poolPromise) {
    poolPromise = createPool();
  }

  return poolPromise;
}

async function withDatabase(callback) {
  const pool = await getPool();

  if (!pool) {
    return null;
  }

  return callback(pool);
}

module.exports = { getPool, withDatabase };

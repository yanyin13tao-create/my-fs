const { GetSecretValueCommand, SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
const { config } = require('./config');

let cachedSecret = null;

async function getDatabaseSecret() {
  if (!config.dbSecretId) {
    return null;
  }

  if (cachedSecret) {
    return cachedSecret;
  }

  const client = new SecretsManagerClient({ region: config.awsRegion });
  const response = await client.send(new GetSecretValueCommand({ SecretId: config.dbSecretId }));

  if (!response.SecretString) {
    throw new Error('Database secret does not contain SecretString.');
  }

  cachedSecret = JSON.parse(response.SecretString);
  return cachedSecret;
}

module.exports = { getDatabaseSecret };

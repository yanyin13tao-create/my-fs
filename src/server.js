const http = require('node:http');
const { config } = require('./config');
const filesStore = require('./filesStore');
const { createRequestHandler } = require('./routes');

async function start() {
  await filesStore.initialize();

  const server = http.createServer(createRequestHandler({ filesStore }));

  server.listen(config.port, config.host, () => {
    console.log(`File service running on http://${config.host}:${config.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start file service:', error.message);
  process.exit(1);
});

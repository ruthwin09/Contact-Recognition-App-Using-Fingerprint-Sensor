require('dotenv').config();
const http = require('http');
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

async function startServer() {
  await db.initDb();

  server.listen(PORT, () => {
    console.log(`[SERVER] Biometric Contact Recognition API running on port ${PORT}`);
    console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[SERVER] Fingerprint Mode: ${process.env.FINGERPRINT_MODE || 'mock'}`);
  });
}

startServer().catch(err => {
  console.error('[SERVER] Startup failure:', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[SERVER] Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err);
  process.exit(1);
});

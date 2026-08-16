require('dotenv').config();
const http = require('http');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`[SERVER] Biometric Contact Recognition API running on port ${PORT}`);
  console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] Fingerprint Mode: ${process.env.FINGERPRINT_MODE || 'mock'}`);
});

process.on('unhandledRejection', (err) => {
  console.error('[SERVER] Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('[SERVER] Uncaught Exception:', err);
  process.exit(1);
});

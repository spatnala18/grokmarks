import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';

// Validate environment variables
validateConfig();

const app = express();

// Middleware
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Placeholder for future routes
app.get('/', (req, res) => {
  res.json({
    name: 'Grokmarks API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      auth: {
        login: 'GET /auth/login',
        callback: 'GET /auth/callback',
        me: 'GET /auth/me',
        logout: 'POST /auth/logout',
      },
    },
  });
});

// Start server
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`🚀 Grokmarks backend running on http://localhost:${config.port}`);
  console.log(`   Frontend URL: ${config.frontendUrl}`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${config.port} is already in use`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  server.close();
  process.exit(0);
});

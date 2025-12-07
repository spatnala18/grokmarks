import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config, validateConfig } from './config';
import authRoutes from './routes/auth';
import xDataRoutes from './routes/x-data';
import topicsRoutes from './routes/topics';
import testRoutes from './routes/test';
import { store } from './store/memory-store';
import { getPodcastPath } from './services/grok-voice';

// Validate environment variables
validateConfig();

const app = express();

// Middleware
app.use(cors({
  origin: true, // Allow all origins for testing (will restrict in production)
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/api/x', xDataRoutes);
app.use('/api/topics', topicsRoutes);
app.use('/test', testRoutes);

// Serve podcast audio files
app.get('/api/podcasts/:filename', (req, res) => {
  const { filename } = req.params;
  
  // Validate filename (security) - allow mp3, wav, opus, flac
  if (!filename.match(/^podcast_[\w-]+_\d+\.(mp3|wav|opus|flac)$/)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  const filePath = getPodcastPath(filename);
  
  if (!filePath) {
    return res.status(404).json({ error: 'Podcast not found' });
  }
  
  // Set appropriate content type based on extension
  const ext = filename.split('.').pop();
  const contentTypes: Record<string, string> = {
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    opus: 'audio/opus',
    flac: 'audio/flac',
  };
  
  res.setHeader('Content-Type', contentTypes[ext!] || 'audio/mpeg');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    store: store.getStats(),
  });
});

// API documentation
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
        status: 'GET /auth/status',
      },
      xData: {
        sync: 'POST /api/x/sync',
        refresh: 'POST /api/x/refresh',
        posts: 'GET /api/x/posts',
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

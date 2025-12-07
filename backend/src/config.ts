import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root (one level up from backend)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '8000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // X (Twitter) OAuth 2.0
  x: {
    clientId: process.env.X_CLIENT_ID || '',
    clientSecret: process.env.X_CLIENT_SECRET || '',
    redirectUri: process.env.X_REDIRECT_URI || 'http://localhost:8000/auth/callback',
  },

  // xAI (Grok)
  xai: {
    apiKey: process.env.XAI_API_KEY || '',
    baseUrl: 'https://api.x.ai/v1',
  },
};

// Validate required environment variables
export function validateConfig(): void {
  const required = [
    ['X_CLIENT_ID', config.x.clientId],
    ['X_CLIENT_SECRET', config.x.clientSecret],
    ['XAI_API_KEY', config.xai.apiKey],
  ];

  const missing = required.filter(([, value]) => !value);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(([name]) => console.error(`  - ${name}`));
    console.error('\nPlease create a .env file in the project root with these variables.');
    process.exit(1);
  }
}

import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  getAuthenticatedUser,
  refreshAccessToken,
} from '../services/x-auth';
import { store } from '../store/index';
import { UserSession } from '../types';
import { config } from '../config';

const router = Router();

// Cookie name for session
const SESSION_COOKIE = 'grokmarks_session';

// ============================================
// Middleware to get current session
// ============================================

export interface AuthenticatedRequest extends Request {
  session?: UserSession;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  
  if (!sessionId) {
    next();
    return;
  }

  const session = store.getSession(sessionId);
  
  if (!session) {
    // Clear invalid cookie
    res.clearCookie(SESSION_COOKIE);
    next();
    return;
  }

  // Check if token is expired and needs refresh
  if (session.tokenExpiresAt && session.refreshToken) {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    if (now >= session.tokenExpiresAt - bufferTime) {
      try {
        console.log('Token expired, refreshing...');
        const tokens = await refreshAccessToken(session.refreshToken);
        
        store.updateSession(sessionId, {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || session.refreshToken,
          tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
        });
        
        // Get updated session
        req.session = store.getSession(sessionId);
      } catch (error) {
        console.error('Failed to refresh token:', error);
        // Clear session on refresh failure
        store.deleteSession(sessionId);
        res.clearCookie(SESSION_COOKIE);
        next();
        return;
      }
    } else {
      req.session = session;
    }
  } else {
    req.session = session;
  }

  next();
}

/**
 * Middleware that requires authentication
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.session) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  next();
}

// ============================================
// Routes
// ============================================

/**
 * GET /auth/login
 * Initiates OAuth 2.0 PKCE flow - redirects to X
 */
router.get('/login', (req: Request, res: Response) => {
  // Generate PKCE values
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = generateState();

  // Store OAuth state for validation on callback
  store.saveOAuthState({
    state,
    codeVerifier,
    createdAt: Date.now(),
  });

  // Build and redirect to authorization URL
  const authUrl = buildAuthorizationUrl(state, codeChallenge);
  
  console.log('Redirecting to X for authorization...');
  res.redirect(authUrl);
});

/**
 * GET /auth/callback
 * Handles OAuth callback from X
 */
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(
      `${config.frontendUrl}?error=${encodeURIComponent(String(error))}`
    );
  }

  // Validate required params
  if (!code || !state) {
    return res.redirect(
      `${config.frontendUrl}?error=missing_params`
    );
  }

  // Validate state and get code verifier
  const oauthState = store.getOAuthState(String(state));
  
  if (!oauthState) {
    console.error('Invalid or expired state');
    return res.redirect(
      `${config.frontendUrl}?error=invalid_state`
    );
  }

  // Clean up used state
  store.deleteOAuthState(String(state));

  try {
    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(String(code), oauthState.codeVerifier);
    
    console.log('Tokens received, fetching user info...');
    // Get user info
    const xUser = await getAuthenticatedUser(tokens.access_token);
    
    console.log(`Authenticated as @${xUser.username}`);

    // Create session
    const sessionId = uuidv4();
    const session: UserSession = {
      sessionId,
      xUserId: xUser.id,
      xUsername: xUser.username,
      xDisplayName: xUser.name,
      xProfileImageUrl: xUser.profile_image_url,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiresAt: Date.now() + tokens.expires_in * 1000,
      createdAt: new Date().toISOString(),
    };

    store.createSession(session);

    // Set session cookie
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend (root - SPA will handle auth state)
    res.redirect(config.frontendUrl);
  } catch (error: any) {
    console.error('OAuth callback error:', error.response?.data || error.message);
    res.redirect(
      `${config.frontendUrl}?error=auth_failed`
    );
  }
});

/**
 * GET /auth/me
 * Returns current authenticated user info
 */
router.get('/me', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.session) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  res.json({
    success: true,
    data: {
      userId: req.session.xUserId,
      username: req.session.xUsername,
      displayName: req.session.xDisplayName,
      profileImageUrl: req.session.xProfileImageUrl,
    },
  });
});

/**
 * POST /auth/logout
 * Clears session and logs out user
 */
router.post('/logout', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (req.session) {
    store.deleteSession(req.session.sessionId);
  }
  
  res.clearCookie(SESSION_COOKIE);
  res.json({ success: true });
});

/**
 * GET /auth/status
 * Check if user is authenticated and return user details if so
 */
router.get('/status', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  if (!req.session) {
    return res.json({
      success: true,
      data: {
        authenticated: false,
      },
    });
  }

  // Return authenticated status WITH user info
  res.json({
    success: true,
    data: {
      authenticated: true,
      user: {
        xUserId: req.session.xUserId,
        username: req.session.xUsername,
        displayName: req.session.xDisplayName,
        profileImageUrl: req.session.xProfileImageUrl,
      },
    },
  });
});

export default router;

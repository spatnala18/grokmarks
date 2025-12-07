import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, requireAuth } from './auth';
import { getAllBookmarks, getTimelinePosts } from '../services/x-api';
import { store } from '../store/memory-store';
import { Post } from '../types';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/x/sync
 * 
 * Fetches bookmarks and timeline posts from X API.
 * Stores them in memory for later classification.
 * 
 * Query params:
 * - maxBookmarks: Max bookmarks to fetch (default 200)
 * - maxTimeline: Max timeline posts to fetch (default 100)
 */
router.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  
  const maxBookmarks = parseInt(req.query.maxBookmarks as string) || 200;
  const maxTimeline = parseInt(req.query.maxTimeline as string) || 100;

  console.log(`Starting sync for @${session.xUsername}...`);
  console.log(`  Max bookmarks: ${maxBookmarks}, Max timeline: ${maxTimeline}`);

  try {
    const results: {
      bookmarks: Post[];
      timeline: Post[];
      errors: string[];
    } = {
      bookmarks: [],
      timeline: [],
      errors: [],
    };

    // Fetch bookmarks
    try {
      console.log('Fetching bookmarks...');
      const bookmarkResult = await getAllBookmarks(
        session.xUserId,
        session.accessToken,
        maxBookmarks
      );
      results.bookmarks = bookmarkResult.posts;
      console.log(`  Fetched ${results.bookmarks.length} bookmarks`);
      
      if (bookmarkResult.rateLimitInfo) {
        console.log(`  Rate limit: ${bookmarkResult.rateLimitInfo.remaining}/${bookmarkResult.rateLimitInfo.limit}`);
      }
    } catch (error: any) {
      console.error('Error fetching bookmarks:', error.message);
      results.errors.push(`Bookmarks: ${error.message}`);
    }

    // Fetch timeline
    try {
      console.log('Fetching timeline...');
      const timelineResult = await getTimelinePosts(
        session.xUserId,
        session.accessToken,
        session.timelineSinceId, // Use stored cursor if available
        maxTimeline
      );
      results.timeline = timelineResult.posts;
      console.log(`  Fetched ${results.timeline.length} timeline posts`);

      // Update the since_id for next refresh
      if (timelineResult.newestId) {
        store.updateSession(session.sessionId, {
          timelineSinceId: timelineResult.newestId,
          lastSyncAt: new Date().toISOString(),
        });
      }

      if (timelineResult.rateLimitInfo) {
        console.log(`  Rate limit: ${timelineResult.rateLimitInfo.remaining}/${timelineResult.rateLimitInfo.limit}`);
      }
    } catch (error: any) {
      console.error('Error fetching timeline:', error.message);
      results.errors.push(`Timeline: ${error.message}`);
    }

    // Combine all posts (dedupe by ID)
    const allPostsMap = new Map<string, Post>();
    
    for (const post of results.bookmarks) {
      allPostsMap.set(post.id, post);
    }
    
    for (const post of results.timeline) {
      // If post already exists (from bookmarks), keep the bookmark version
      // but note it's also in timeline
      if (!allPostsMap.has(post.id)) {
        allPostsMap.set(post.id, post);
      }
    }

    const allPosts = Array.from(allPostsMap.values());

    // Store posts in memory
    store.savePosts(session.xUserId, allPosts);

    console.log(`Sync complete: ${allPosts.length} unique posts`);

    res.json({
      success: true,
      data: {
        totalPosts: allPosts.length,
        bookmarksCount: results.bookmarks.length,
        timelineCount: results.timeline.length,
        posts: allPosts,
        errors: results.errors.length > 0 ? results.errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync data from X',
    });
  }
});

/**
 * POST /api/x/refresh
 * 
 * Fetches only NEW posts since last sync.
 * Uses stored cursors/since_id to fetch incrementally.
 */
router.post('/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;

  console.log(`Refreshing data for @${session.xUsername}...`);

  try {
    const newPosts: Post[] = [];
    const errors: string[] = [];

    // Fetch new timeline posts using since_id
    if (session.timelineSinceId) {
      try {
        console.log(`Fetching timeline posts since ${session.timelineSinceId}...`);
        const timelineResult = await getTimelinePosts(
          session.xUserId,
          session.accessToken,
          session.timelineSinceId,
          100
        );

        newPosts.push(...timelineResult.posts);
        console.log(`  Fetched ${timelineResult.posts.length} new timeline posts`);

        // Update the since_id
        if (timelineResult.newestId) {
          store.updateSession(session.sessionId, {
            timelineSinceId: timelineResult.newestId,
            lastSyncAt: new Date().toISOString(),
          });
        }
      } catch (error: any) {
        console.error('Error refreshing timeline:', error.message);
        errors.push(`Timeline: ${error.message}`);
      }
    } else {
      console.log('No previous sync - run full sync first');
    }

    // Fetch latest bookmarks (first page only for refresh)
    try {
      console.log('Checking for new bookmarks...');
      const bookmarkResult = await getAllBookmarks(
        session.xUserId,
        session.accessToken,
        50 // Just check first 50 for new ones
      );

      // Find bookmarks that we don't already have
      const existingPosts = store.getAllPosts(session.xUserId);
      const existingIds = new Set(existingPosts.map(p => p.id));
      
      const newBookmarks = bookmarkResult.posts.filter(p => !existingIds.has(p.id));
      newPosts.push(...newBookmarks);
      console.log(`  Found ${newBookmarks.length} new bookmarks`);
    } catch (error: any) {
      console.error('Error refreshing bookmarks:', error.message);
      errors.push(`Bookmarks: ${error.message}`);
    }

    // Save new posts
    if (newPosts.length > 0) {
      store.savePosts(session.xUserId, newPosts);
    }

    console.log(`Refresh complete: ${newPosts.length} new posts`);

    res.json({
      success: true,
      data: {
        newPostsCount: newPosts.length,
        posts: newPosts,
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error: any) {
    console.error('Refresh error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh data from X',
    });
  }
});

/**
 * GET /api/x/posts
 * 
 * Returns all cached posts for the current user.
 */
router.get('/posts', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const posts = store.getAllPosts(session.xUserId);

  res.json({
    success: true,
    data: {
      totalPosts: posts.length,
      posts,
    },
  });
});

export default router;

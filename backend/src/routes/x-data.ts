import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, requireAuth } from './auth';
import { getAllBookmarks, getTimelinePosts } from '../services/x-api';
import { classifyAndCreateTopicSpaces, createCustomTopicSpaces } from '../services/topic-classifier';
import { store } from '../store/index';
import { Post, TopicType } from '../types';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * POST /api/x/sync
 * 
 * Fetches bookmarks from X API and classifies them into Topic Spaces using Grok.
 * Supports both auto-discovery and custom topic modes.
 * 
 * Query params:
 * - maxBookmarks: Max bookmarks to fetch (default 200)
 * - classify: Whether to run Grok classification (default true)
 * 
 * Body (optional):
 * - topicType: 'auto' | 'custom' (default 'auto')
 * - customTopicNames: string[] (required if topicType is 'custom')
 */
router.post('/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  
  const maxBookmarks = parseInt(req.query.maxBookmarks as string) || 200;
  const shouldClassify = req.query.classify !== 'false';
  
  // Get topic classification options from body
  const topicType: TopicType = req.body?.topicType || 'auto';
  const customTopicNames: string[] = req.body?.customTopicNames || [];

  console.log(`Starting sync for @${session.xUsername}...`);
  console.log(`  Max bookmarks: ${maxBookmarks}, Classify: ${shouldClassify}`);
  console.log(`  Topic type: ${topicType}, Custom topics: ${customTopicNames.join(', ') || 'none'}`);

  // Validate custom topics if that mode is selected
  if (topicType === 'custom' && customTopicNames.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Custom topic names are required when topicType is "custom"',
    });
  }

  try {
    const results: {
      bookmarks: Post[];
      errors: string[];
    } = {
      bookmarks: [],
      errors: [],
    };

    // Fetch bookmarks only
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

    // Store posts in memory (only bookmarks now)
    if (results.bookmarks.length > 0) {
      store.savePosts(session.xUserId, results.bookmarks);
    }

    console.log(`Fetched ${results.bookmarks.length} bookmarks`);

    // Update last sync time
    store.updateSession(session.sessionId, {
      lastSyncAt: new Date().toISOString(),
    });

    // Run classification if requested
    let topicSpaces: any[] = [];
    let classificationStats: any = null;
    if (shouldClassify && results.bookmarks.length > 0) {
      try {
        console.log(`Running Grok classification on bookmarks (mode: ${topicType})...`);
        
        let classified;
        if (topicType === 'custom') {
          // Use custom topics mode
          classified = await createCustomTopicSpaces(
            results.bookmarks,
            session.xUserId,
            customTopicNames
          );
        } else {
          // Use auto-discovery mode
          classified = await classifyAndCreateTopicSpaces(results.bookmarks, session.xUserId, {
            topicType: 'auto',
          });
        }
        
        // Update posts with classification results
        store.savePosts(session.xUserId, classified.posts);
        
        // Clear old topic spaces and save new ones
        store.clearTopicSpaces(session.xUserId);
        store.saveTopicSpaces(session.xUserId, classified.topicSpaces);
        
        topicSpaces = classified.topicSpaces;
        classificationStats = classified.stats;
        console.log(`Classification complete: ${topicSpaces.length} Topic Spaces created`);
      } catch (error: any) {
        console.error('Classification error:', error.message);
        results.errors.push(`Classification: ${error.message}`);
      }
    }

    console.log(`Sync complete!`);

    res.json({
      success: true,
      data: {
        totalPosts: results.bookmarks.length,
        bookmarksCount: results.bookmarks.length,
        topicSpacesCount: topicSpaces.length,
        topicSpaces: topicSpaces.map(ts => ({
          id: ts.id,
          title: ts.title,
          description: ts.description,
          type: ts.type,
          postCount: ts.bookmarkTweetIds.length,
          lastBookmarkTime: ts.lastBookmarkTime,
        })),
        classificationStats: classificationStats || undefined,
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
 * Fetches only NEW bookmarks since last sync.
 * Finds bookmarks that don't already exist in store.
 */
router.post('/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;

  console.log(`Refreshing bookmarks for @${session.xUsername}...`);

  try {
    const errors: string[] = [];
    let newBookmarks: Post[] = [];

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
      
      newBookmarks = bookmarkResult.posts.filter(p => !existingIds.has(p.id));
      console.log(`  Found ${newBookmarks.length} new bookmarks`);
    } catch (error: any) {
      console.error('Error refreshing bookmarks:', error.message);
      errors.push(`Bookmarks: ${error.message}`);
    }

    // Save new bookmarks
    if (newBookmarks.length > 0) {
      store.savePosts(session.xUserId, newBookmarks);
    }

    // Update last sync time
    store.updateSession(session.sessionId, {
      lastSyncAt: new Date().toISOString(),
    });

    console.log(`Refresh complete: ${newBookmarks.length} new bookmarks`);

    res.json({
      success: true,
      data: {
        newPostsCount: newBookmarks.length,
        posts: newBookmarks,
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

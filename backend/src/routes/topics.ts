import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, requireAuth } from './auth';
import { store } from '../store/index';
import { TopicSpaceDetailResponse, SegmentedPodcastScript } from '../types';
import { generateBriefing, generatePodcastScript, answerQuestion, generateThread } from '../services/grok-actions';
import { extractTrending } from '../services/trending';
import { generateSegmentedPodcastAudio, getPodcastPath } from '../services/grok-voice';
import { createCustomTopicSpaces } from '../services/topic-classifier';
import type { VoiceId } from '../services/grok-voice';

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/topics
 * 
 * Returns all Topic Spaces for the current user
 */
router.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const topicSpaces = store.getAllTopicSpaces(session.xUserId);

  // Sort by post count (descending)
  const sorted = topicSpaces.sort((a, b) => b.bookmarkTweetIds.length - a.bookmarkTweetIds.length);

  res.json({
    success: true,
    data: {
      count: sorted.length,
      topicSpaces: sorted.map(ts => ({
        id: ts.id,
        title: ts.title,
        description: ts.description,
        type: ts.type,
        postCount: ts.bookmarkTweetIds.length,
        newPostCount: ts.newPostCount,
        lastBookmarkTime: ts.lastBookmarkTime,
        updatedAt: ts.updatedAt,
      })),
    },
  });
});

/**
 * GET /api/topics/:id
 * 
 * Returns a single Topic Space with its posts
 */
router.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  // Get the posts for this topic
  const posts = store.getPostsByIds(session.xUserId, topicSpace.bookmarkTweetIds);

  // Sort posts by date (newest first)
  posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Extract trending data
  const trending = extractTrending(posts);

  const response: TopicSpaceDetailResponse = {
    ...topicSpace,
    posts,
    trending,
  };

  res.json({
    success: true,
    data: response,
  });
});

/**
 * POST /api/topics/custom
 * 
 * Create custom topic spaces from user-provided topic names.
 * Classifies all user's bookmarks into the specified topics.
 * Body: { topicNames: string[] }
 */
router.post('/custom', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { topicNames } = req.body;

  if (!topicNames || !Array.isArray(topicNames) || topicNames.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'topicNames array is required and must not be empty',
    });
  }

  // Validate topic names
  const validTopicNames = topicNames
    .map(n => (typeof n === 'string' ? n.trim() : ''))
    .filter(n => n.length > 0);

  if (validTopicNames.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'At least one valid topic name is required',
    });
  }

  if (validTopicNames.length > 15) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 15 custom topics allowed',
    });
  }

  try {
    console.log(`Creating custom topics for @${session.xUsername}: ${validTopicNames.join(', ')}`);
    
    // Get all posts for this user
    const allPosts = store.getAllPosts(session.xUserId);
    
    if (allPosts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No bookmarks found. Please sync your bookmarks first.',
      });
    }

    // Classify into custom topics
    const { posts: classifiedPosts, topicSpaces, stats } = await createCustomTopicSpaces(
      allPosts,
      session.xUserId,
      validTopicNames
    );

    // Update posts with classification results
    store.savePosts(session.xUserId, classifiedPosts);

    // Save the custom topic spaces (don't clear existing auto topics)
    store.saveTopicSpaces(session.xUserId, topicSpaces);

    console.log(`Custom topics created: ${topicSpaces.length} topics from ${stats.totalPosts} bookmarks`);

    res.json({
      success: true,
      data: {
        topicSpaces: topicSpaces.map(ts => ({
          id: ts.id,
          title: ts.title,
          description: ts.description,
          type: ts.type,
          postCount: ts.bookmarkTweetIds.length,
          lastBookmarkTime: ts.lastBookmarkTime,
        })),
        stats,
      },
    });
  } catch (error: any) {
    console.error('Custom topics error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create custom topics',
    });
  }
});

/**
 * GET /api/topics/:id/search
 * 
 * Search within a topic's bookmarks
 * Query: q (search query)
 */
router.get('/:id/search', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;
  const query = (req.query.q as string || '').trim().toLowerCase();

  if (!query) {
    return res.status(400).json({
      success: false,
      error: 'Search query (q) is required',
    });
  }

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  // Get the posts for this topic
  const posts = store.getPostsByIds(session.xUserId, topicSpace.bookmarkTweetIds);

  // Simple keyword search
  const searchTerms = query.split(/\s+/).filter(t => t.length > 0);
  
  const matchedPosts = posts.filter(post => {
    const searchableText = `${post.text} ${post.authorUsername} ${post.authorDisplayName} ${post.summary || ''}`.toLowerCase();
    return searchTerms.some(term => searchableText.includes(term));
  });

  // Score and sort by relevance (number of matching terms)
  const scoredPosts = matchedPosts.map(post => {
    const searchableText = `${post.text} ${post.authorUsername} ${post.authorDisplayName} ${post.summary || ''}`.toLowerCase();
    let score = 0;
    for (const term of searchTerms) {
      const matches = (searchableText.match(new RegExp(term, 'g')) || []).length;
      score += matches;
    }
    return { post, score };
  });

  // Sort by score descending, then by date
  scoredPosts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
  });

  res.json({
    success: true,
    data: {
      query,
      totalResults: scoredPosts.length,
      posts: scoredPosts.map(sp => sp.post),
    },
  });
});

/**
 * POST /api/topics/:id/mark-seen
 * 
 * Resets the new post counter for a Topic Space
 */
router.post('/:id/mark-seen', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  store.updateTopicSpace(session.xUserId, id, { newPostCount: 0 });

  res.json({
    success: true,
    data: { message: 'Marked as seen' },
  });
});

/**
 * POST /api/topics/:id/briefing
 * 
 * Generate a briefing summary for a Topic Space
 */
router.post('/:id/briefing', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  const posts = store.getPostsByIds(session.xUserId, topicSpace.bookmarkTweetIds);

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No posts in this Topic Space',
    });
  }

  try {
    console.log(`Generating briefing for "${topicSpace.title}" (${posts.length} posts)...`);
    const result = await generateBriefing(topicSpace.title, posts);
    result.topicSpaceId = id;
    
    // Save the result
    store.saveActionResult(session.xUserId, result);
    
    console.log(`Briefing generated successfully`);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Briefing error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate briefing',
    });
  }
});

/**
 * POST /api/topics/:id/podcast
 * 
 * Generate a SEGMENTED podcast script for a Topic Space
 * Returns both the action result and the segmented script for audio generation
 */
router.post('/:id/podcast', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  const posts = store.getPostsByIds(session.xUserId, topicSpace.bookmarkTweetIds);

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No posts in this Topic Space',
    });
  }

  try {
    console.log(`Generating SEGMENTED podcast script for "${topicSpace.title}" (${posts.length} posts)...`);
    const { actionResult, segmentedScript } = await generatePodcastScript(topicSpace.title, posts);
    actionResult.topicSpaceId = id;
    
    // Save the action result
    store.saveActionResult(session.xUserId, actionResult);
    
    console.log(`Podcast script generated: ${segmentedScript.segments.length} segments`);
    
    res.json({
      success: true,
      data: {
        actionResult,
        segmentedScript,
      },
    });
  } catch (error: any) {
    console.error('Podcast error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate podcast script',
    });
  }
});

/**
 * POST /api/topics/:id/qa
 * 
 * Answer a question about a Topic Space
 * Body: { question: string }
 */
router.post('/:id/qa', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;
  const { question } = req.body;

  if (!question || typeof question !== 'string' || question.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Question is required',
    });
  }

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  const posts = store.getPostsByIds(session.xUserId, topicSpace.bookmarkTweetIds);

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No posts in this Topic Space',
    });
  }

  try {
    console.log(`Answering question for "${topicSpace.title}": "${question.slice(0, 50)}..."`);
    const result = await answerQuestion(topicSpace.title, posts, question.trim());
    result.topicSpaceId = id;
    
    // Save the result
    store.saveActionResult(session.xUserId, result);
    
    console.log(`Question answered successfully`);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Q&A error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to answer question',
    });
  }
});

/**
 * POST /api/topics/:id/thread
 * 
 * Generate a Twitter/X thread for a Topic Space
 */
router.post('/:id/thread', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  const posts = store.getPostsByIds(session.xUserId, topicSpace.bookmarkTweetIds);

  if (posts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No posts in this Topic Space',
    });
  }

  try {
    console.log(`Generating thread for "${topicSpace.title}" (${posts.length} posts)...`);
    const result = await generateThread(topicSpace.title, posts);
    result.topicSpaceId = id;
    
    // Save the result
    store.saveActionResult(session.xUserId, result);
    
    console.log(`Thread generated successfully`);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Thread error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate thread',
    });
  }
});

/**
 * GET /api/topics/:id/history
 * 
 * Get action history for a Topic Space
 */
router.get('/:id/history', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  const results = store.getActionResults(session.xUserId, id);

  res.json({
    success: true,
    data: {
      count: results.length,
      results: results.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    },
  });
});

/**
 * POST /api/topics/:id/podcast-audio
 * 
 * Generate audio from a SEGMENTED podcast script using Grok Voice API
 * Requires: segmentedScript in request body
 * Optional: voice (VoiceId)
 * Returns: audio URL + timeline manifest for frontend sync
 */
router.post('/:id/podcast-audio', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const session = req.session!;
  const { id } = req.params;
  const { segmentedScript, voice } = req.body as { 
    segmentedScript?: SegmentedPodcastScript; 
    voice?: VoiceId;
  };

  console.log(`Generating SEGMENTED podcast audio for topic ${id}...`);

  const topicSpace = store.getTopicSpace(session.xUserId, id);
  
  if (!topicSpace) {
    return res.status(404).json({
      success: false,
      error: 'Topic Space not found',
    });
  }

  if (!segmentedScript || !segmentedScript.segments || segmentedScript.segments.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No segmented podcast script provided. Generate a podcast script first.',
    });
  }

  try {
    console.log(`Processing ${segmentedScript.segments.length} segments...`);
    
    const result = await generateSegmentedPodcastAudio(id, segmentedScript, { voice });
    
    console.log(`Podcast audio generated: ${result.podcastUrl}`);
    console.log(`Timeline: ${result.timeline.entries.length} entries, ${result.timeline.totalDuration.toFixed(2)}s total`);
    
    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Podcast audio error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate podcast audio',
    });
  }
});

export default router;

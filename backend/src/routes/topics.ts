import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, requireAuth } from './auth';
import { store } from '../store/index';
import { TopicSpaceDetailResponse, SegmentedPodcastScript } from '../types';
import { generateBriefing, generatePodcastScript, answerQuestion, generateThread } from '../services/grok-actions';
import { extractTrending } from '../services/trending';
import { generateSegmentedPodcastAudio, getPodcastPath } from '../services/grok-voice';
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
  const sorted = topicSpaces.sort((a, b) => b.postIds.length - a.postIds.length);

  res.json({
    success: true,
    data: {
      count: sorted.length,
      topicSpaces: sorted.map(ts => ({
        id: ts.id,
        title: ts.title,
        description: ts.description,
        postCount: ts.postIds.length,
        newPostCount: ts.newPostCount,
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
  const posts = store.getPostsByIds(session.xUserId, topicSpace.postIds);

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

  const posts = store.getPostsByIds(session.xUserId, topicSpace.postIds);

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

  const posts = store.getPostsByIds(session.xUserId, topicSpace.postIds);

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

  const posts = store.getPostsByIds(session.xUserId, topicSpace.postIds);

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

  const posts = store.getPostsByIds(session.xUserId, topicSpace.postIds);

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

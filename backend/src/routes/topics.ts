import { Router, Response } from 'express';
import { AuthenticatedRequest, authMiddleware, requireAuth } from './auth';
import { store } from '../store/memory-store';
import { TopicSpaceDetailResponse } from '../types';

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

  const response: TopicSpaceDetailResponse = {
    ...topicSpace,
    posts,
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

export default router;

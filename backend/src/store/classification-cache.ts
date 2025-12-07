// ============================================
// Classification Cache
// ============================================
// Per-post caching for classification results.
// Designed to be swappable with a persistent store later.

import { HYPERPARAMS } from '../config/hyperparams';

/**
 * Cached classification result for a single post
 */
export interface CachedClassification {
  postId: string;
  textHash: string;           // Hash of post text to detect changes
  topicLabel: string;         // Assigned topic label
  summary: string;            // Per-post summary
  rawLabel?: string;          // Original label before normalization
  cachedAt: number;           // Timestamp when cached
}

/**
 * Simple hash function for post text (used to detect changes)
 */
function hashText(text: string): string {
  // Simple djb2 hash - good enough for our purposes
  let hash = 5381;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 33) ^ text.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * In-memory classification cache
 * Keyed by xUserId -> postId -> CachedClassification
 */
class ClassificationCache {
  private cache: Map<string, Map<string, CachedClassification>> = new Map();

  /**
   * Get user's cache, creating if needed
   */
  private getUserCache(xUserId: string): Map<string, CachedClassification> {
    let userCache = this.cache.get(xUserId);
    if (!userCache) {
      userCache = new Map();
      this.cache.set(xUserId, userCache);
    }
    return userCache;
  }

  /**
   * Check if a post has a valid cached classification
   * Returns the cached result if valid, undefined otherwise
   */
  get(xUserId: string, postId: string, currentText: string): CachedClassification | undefined {
    if (!HYPERPARAMS.ENABLE_CACHE) return undefined;

    const userCache = this.getUserCache(xUserId);
    const cached = userCache.get(postId);
    
    if (!cached) return undefined;
    
    // Check if text has changed
    const currentHash = hashText(currentText);
    if (cached.textHash !== currentHash) {
      // Text changed, invalidate cache
      userCache.delete(postId);
      return undefined;
    }
    
    return cached;
  }

  /**
   * Store a classification result in cache
   */
  set(xUserId: string, postId: string, text: string, topicLabel: string, summary: string): void {
    if (!HYPERPARAMS.ENABLE_CACHE) return;

    const userCache = this.getUserCache(xUserId);
    userCache.set(postId, {
      postId,
      textHash: hashText(text),
      topicLabel,
      summary,
      cachedAt: Date.now(),
    });
  }

  /**
   * Batch set multiple classifications
   */
  setMany(xUserId: string, entries: Array<{ postId: string; text: string; topicLabel: string; summary: string }>): void {
    if (!HYPERPARAMS.ENABLE_CACHE) return;

    const userCache = this.getUserCache(xUserId);
    const now = Date.now();
    
    for (const entry of entries) {
      userCache.set(entry.postId, {
        postId: entry.postId,
        textHash: hashText(entry.text),
        topicLabel: entry.topicLabel,
        summary: entry.summary,
        cachedAt: now,
      });
    }
  }

  /**
   * Update raw labels to normalized labels after normalization pass
   */
  applyNormalization(xUserId: string, labelMapping: Map<string, string>): void {
    const userCache = this.getUserCache(xUserId);
    
    for (const [postId, cached] of userCache) {
      const normalizedLabel = labelMapping.get(cached.topicLabel);
      if (normalizedLabel && normalizedLabel !== cached.topicLabel) {
        cached.rawLabel = cached.topicLabel;
        cached.topicLabel = normalizedLabel;
      }
    }
  }

  /**
   * Get all cached classifications for a user
   */
  getAll(xUserId: string): CachedClassification[] {
    const userCache = this.getUserCache(xUserId);
    return Array.from(userCache.values());
  }

  /**
   * Get cache stats for logging
   */
  getStats(xUserId: string): { total: number; oldestAge: number; newestAge: number } {
    const userCache = this.getUserCache(xUserId);
    const now = Date.now();
    
    if (userCache.size === 0) {
      return { total: 0, oldestAge: 0, newestAge: 0 };
    }
    
    let oldest = now;
    let newest = 0;
    
    for (const cached of userCache.values()) {
      if (cached.cachedAt < oldest) oldest = cached.cachedAt;
      if (cached.cachedAt > newest) newest = cached.cachedAt;
    }
    
    return {
      total: userCache.size,
      oldestAge: Math.round((now - oldest) / 1000 / 60), // minutes
      newestAge: Math.round((now - newest) / 1000 / 60), // minutes
    };
  }

  /**
   * Clear cache for a user
   */
  clear(xUserId: string): void {
    this.cache.delete(xUserId);
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const classificationCache = new ClassificationCache();

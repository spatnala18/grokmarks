// ============================================
// Hyperparameters & Configuration
// ============================================
// Centralized config for all tunable parameters.
// Easy to adjust during hackathon demo.

export const HYPERPARAMS = {
  // ============================================
  // Classification Settings
  // ============================================
  
  /** Number of posts to classify in a single Grok API call */
  CLASSIFICATION_BATCH_SIZE: 20,
  
  /** Temperature for classification (lower = more consistent) */
  CLASSIFICATION_TEMPERATURE: 0.3,
  
  /** Max characters of tweet text to send for classification */
  CLASSIFICATION_MAX_TEXT_LENGTH: 500,

  // ============================================
  // Caching Settings
  // ============================================
  
  /** Enable per-post classification cache (dramatically reduces Grok calls) */
  ENABLE_CACHE: true,
  
  /** If true, skip classification for posts that already have cached results */
  SKIP_CACHED_POSTS: true,

  // ============================================
  // Label Normalization Settings
  // ============================================
  
  /** Enable Grok-based label normalization (merges similar topics) */
  ENABLE_NORMALIZATION: true,
  
  /** Target number of canonical labels after normalization */
  NORMALIZATION_TARGET_LABELS: 12,
  
  /** Max canonical labels allowed */
  NORMALIZATION_MAX_LABELS: 15,
  
  /** Temperature for normalization (lower = more deterministic merging) */
  NORMALIZATION_TEMPERATURE: 0.2,

  // ============================================
  // Topic Space Settings
  // ============================================
  
  /** Maximum number of distinct TopicSpaces to show (rest go to Long Tail) */
  MAX_TOPICS: 20,
  
  /** Minimum posts for a topic to be shown (topics below this → Long Tail) */
  MIN_POSTS_PER_TOPIC: 2,
  
  /** Label used for merged small/overflow topics */
  LONG_TAIL_LABEL: 'Long Tail / Misc',
  
  /** Minimum posts for a topic to get a Grok-generated description */
  MIN_POSTS_FOR_DESCRIPTION: 3,
  
  /** Temperature for topic title/description generation */
  TOPIC_DESCRIPTION_TEMPERATURE: 0.5,
  
  /** Max sample posts to include when generating topic descriptions */
  MAX_SAMPLE_POSTS_FOR_DESCRIPTION: 10,

  // ============================================
  // Logging & Observability
  // ============================================
  
  /** Log detailed stats after classification runs */
  LOG_CLASSIFICATION_STATS: true,
  
  /** Log cache hit/miss info */
  LOG_CACHE_STATS: true,
  
  /** Log normalization details */
  LOG_NORMALIZATION_STATS: true,
};

// Type export for type-safe access
export type Hyperparams = typeof HYPERPARAMS;

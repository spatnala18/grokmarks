// ============================================
// Label Normalizer Service
// ============================================
// Uses Grok to merge similar topic labels into canonical names.

import { grokStrong, parseJsonResponse, ChatMessage } from './grok';
import { HYPERPARAMS } from '../config/hyperparams';

/**
 * Label frequency info for normalization
 */
interface LabelInfo {
  label: string;
  count: number;
}

/**
 * Normalization response from Grok
 */
interface NormalizationResponse {
  mapping: Array<{
    raw: string;
    canonical: string;
  }>;
  canonicalLabels: string[];
}

/**
 * Result of normalization process
 */
export interface NormalizationResult {
  /** Map from raw label -> canonical label */
  mapping: Map<string, string>;
  /** List of canonical labels */
  canonicalLabels: string[];
  /** Whether normalization was successful */
  success: boolean;
  /** Stats about the normalization */
  stats: {
    rawLabelCount: number;
    canonicalLabelCount: number;
    mergedCount: number;
  };
}

/**
 * Normalize topic labels using Grok
 * Takes raw labels with frequencies and returns a mapping to canonical labels
 */
export async function normalizeLabels(
  labelCounts: Map<string, number>
): Promise<NormalizationResult> {
  // If normalization is disabled, return identity mapping
  if (!HYPERPARAMS.ENABLE_NORMALIZATION) {
    const mapping = new Map<string, string>();
    const canonicalLabels: string[] = [];
    
    for (const label of labelCounts.keys()) {
      mapping.set(label, label);
      canonicalLabels.push(label);
    }
    
    return {
      mapping,
      canonicalLabels,
      success: true,
      stats: {
        rawLabelCount: labelCounts.size,
        canonicalLabelCount: labelCounts.size,
        mergedCount: 0,
      },
    };
  }

  // Build label info for prompt
  const labelInfos: LabelInfo[] = Array.from(labelCounts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  if (labelInfos.length === 0) {
    return {
      mapping: new Map(),
      canonicalLabels: [],
      success: true,
      stats: { rawLabelCount: 0, canonicalLabelCount: 0, mergedCount: 0 },
    };
  }

  // If we already have few enough labels, skip normalization
  if (labelInfos.length <= HYPERPARAMS.NORMALIZATION_TARGET_LABELS) {
    const mapping = new Map<string, string>();
    const canonicalLabels: string[] = [];
    
    for (const { label } of labelInfos) {
      mapping.set(label, label);
      canonicalLabels.push(label);
    }
    
    if (HYPERPARAMS.LOG_NORMALIZATION_STATS) {
      console.log(`  Skipping normalization: only ${labelInfos.length} labels`);
    }
    
    return {
      mapping,
      canonicalLabels,
      success: true,
      stats: {
        rawLabelCount: labelInfos.length,
        canonicalLabelCount: labelInfos.length,
        mergedCount: 0,
      },
    };
  }

  // Format labels for prompt
  const labelsText = labelInfos
    .map(({ label, count }) => `- "${label}" (${count} posts)`)
    .join('\n');

  const systemPrompt = `You are a topic taxonomy expert. Your job is to normalize and consolidate topic labels.

Given a list of raw topic labels with their frequencies, create a clean set of canonical topic names by:
1. Merging similar/overlapping topics (e.g., "AI/ML", "Machine Learning", "Artificial Intelligence" → "AI & Machine Learning")
2. Keeping distinct topics separate
3. Using clear, concise names (2-5 words)
4. Preserving important distinctions (don't over-merge)

Target: ${HYPERPARAMS.NORMALIZATION_TARGET_LABELS} canonical labels (max ${HYPERPARAMS.NORMALIZATION_MAX_LABELS})

Return JSON with this exact structure:
{
  "mapping": [
    { "raw": "original label 1", "canonical": "Canonical Name" },
    { "raw": "original label 2", "canonical": "Canonical Name" },
    ...
  ],
  "canonicalLabels": ["Canonical Name 1", "Canonical Name 2", ...]
}

Every raw label MUST appear exactly once in the mapping.`;

  const userPrompt = `Normalize these ${labelInfos.length} topic labels:\n\n${labelsText}`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  try {
    const response = await grokStrong(messages, {
      temperature: HYPERPARAMS.NORMALIZATION_TEMPERATURE,
      response_format: { type: 'json_object' },
    });

    if (HYPERPARAMS.LOG_NORMALIZATION_STATS) {
      console.log(`  Normalization model: ${response.model}, tokens: ${response.usage.total_tokens}`);
    }

    const parsed = parseJsonResponse<NormalizationResponse>(response.content);
    
    // Build mapping
    const mapping = new Map<string, string>();
    for (const { raw, canonical } of parsed.mapping) {
      mapping.set(raw, canonical);
    }
    
    // Ensure all raw labels are mapped (fallback to self-mapping)
    for (const { label } of labelInfos) {
      if (!mapping.has(label)) {
        mapping.set(label, label);
      }
    }

    const mergedCount = labelInfos.length - parsed.canonicalLabels.length;

    if (HYPERPARAMS.LOG_NORMALIZATION_STATS) {
      console.log(`  Normalization: ${labelInfos.length} raw → ${parsed.canonicalLabels.length} canonical (merged ${mergedCount})`);
    }

    return {
      mapping,
      canonicalLabels: parsed.canonicalLabels,
      success: true,
      stats: {
        rawLabelCount: labelInfos.length,
        canonicalLabelCount: parsed.canonicalLabels.length,
        mergedCount,
      },
    };
  } catch (error) {
    console.error('Label normalization failed, using raw labels:', error);
    
    // Fallback: identity mapping
    const mapping = new Map<string, string>();
    const canonicalLabels: string[] = [];
    
    for (const { label } of labelInfos) {
      mapping.set(label, label);
      canonicalLabels.push(label);
    }
    
    return {
      mapping,
      canonicalLabels,
      success: false,
      stats: {
        rawLabelCount: labelInfos.length,
        canonicalLabelCount: labelInfos.length,
        mergedCount: 0,
      },
    };
  }
}

/**
 * Apply topic cap and merge small topics into Long Tail
 * Returns the final label mapping after applying caps
 */
export function applyTopicCap(
  labelCounts: Map<string, number>,
  existingMapping: Map<string, string>
): Map<string, string> {
  // Count posts per canonical label
  const canonicalCounts = new Map<string, number>();
  
  for (const [rawLabel, count] of labelCounts) {
    const canonical = existingMapping.get(rawLabel) || rawLabel;
    canonicalCounts.set(
      canonical,
      (canonicalCounts.get(canonical) || 0) + count
    );
  }

  // Sort by count descending
  const sortedCanonicals = Array.from(canonicalCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  // Determine which labels go to Long Tail
  const longTailLabels = new Set<string>();
  
  for (let i = 0; i < sortedCanonicals.length; i++) {
    const [label, count] = sortedCanonicals[i];
    
    // Check if below minimum posts
    if (count < HYPERPARAMS.MIN_POSTS_PER_TOPIC) {
      longTailLabels.add(label);
      continue;
    }
    
    // Check if beyond max topics
    // Count how many non-long-tail labels we have before this one
    const visibleBefore = sortedCanonicals
      .slice(0, i)
      .filter(([l]) => !longTailLabels.has(l))
      .length;
    
    if (visibleBefore >= HYPERPARAMS.MAX_TOPICS) {
      longTailLabels.add(label);
    }
  }

  // Build final mapping
  const finalMapping = new Map<string, string>();
  
  for (const [rawLabel] of labelCounts) {
    const canonical = existingMapping.get(rawLabel) || rawLabel;
    if (longTailLabels.has(canonical)) {
      finalMapping.set(rawLabel, HYPERPARAMS.LONG_TAIL_LABEL);
    } else {
      finalMapping.set(rawLabel, canonical);
    }
  }

  if (HYPERPARAMS.LOG_NORMALIZATION_STATS && longTailLabels.size > 0) {
    console.log(`  Topic cap: ${longTailLabels.size} labels merged into "${HYPERPARAMS.LONG_TAIL_LABEL}"`);
  }

  return finalMapping;
}

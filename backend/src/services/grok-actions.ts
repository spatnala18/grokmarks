// ============================================
// Grok Actions Service
// ============================================
// Briefing, Podcast Script, and Q&A actions for Topic Spaces

import { v4 as uuidv4 } from 'uuid';
import { grokStrong, parseJsonResponse } from './grok';
import { HYPERPARAMS } from '../config/hyperparams';
import { Post, ActionResult, ActionType, PodcastSegment, SegmentedPodcastScript } from '../types';

/**
 * Briefing response from Grok - with inline citations
 */
interface BriefingResponse {
  title: string;
  intro: string;           // Introduction paragraph with [tweetId] citations
  keyPoints: string[];     // Key points with [tweetId] citations inline
  citedTweetIds: string[]; // All tweet IDs that were cited
}

/**
 * Podcast script response from Grok
 */
interface PodcastResponse {
  title: string;
  script: string;
  mentionedHandles: string[];  // @handles mentioned in the script
  relatedTweetIds: string[];   // Tweet IDs for "show notes"
}

/**
 * Q&A response from Grok
 */
interface QAResponse {
  answer: string;          // Answer with [tweetId] citations inline
  citedTweetIds: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Format posts for inclusion in prompts - includes ID for citation
 */
function formatPostsForPrompt(posts: Post[], maxPosts: number = 20): string {
  const selected = posts.slice(0, maxPosts);
  return selected.map((p, i) => 
    `[Tweet ID: ${p.id}] @${p.authorUsername}:\n"${p.text}"`
  ).join('\n\n---\n\n');
}

/**
 * Get list of valid tweet IDs for grounding check
 */
function getValidTweetIds(posts: Post[]): Set<string> {
  return new Set(posts.map(p => p.id));
}

/**
 * Generate a briefing for a Topic Space - with inline citations
 */
export async function generateBriefing(
  topicTitle: string,
  posts: Post[]
): Promise<ActionResult> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  const systemPrompt = `You are a senior research analyst creating an insightful briefing from Twitter/X discussions.

YOUR GOAL: Extract the most interesting, specific, and actionable insights from these tweets. Don't be generic - capture what makes these discussions unique and valuable.

WRITING STYLE:
- Be specific: Include names, numbers, paper titles, tool names, concrete claims
- Be opinionated: Highlight what's controversial, surprising, or important
- Be useful: What would a busy professional want to know from skimming this?
- Capture the "hot takes" and unique perspectives
- Quote memorable phrases when they're pithy

CITATION REQUIREMENTS:
- Cite tweets inline using [tweetId] format (the exact Tweet ID provided)
- Place citations at the end of claims: "Reward should live in the agent [1997071224774517003]."
- Multiple citations are fine: "This view is contested [id1] [id2]."
- ONLY use Tweet IDs from the provided list. Never invent IDs.

OUTPUT STRUCTURE:
{
  "title": "Catchy, specific title that captures the theme",
  "intro": "2-3 sentences that hook the reader with the most interesting finding or debate. Include citations.",
  "keyPoints": [
    "Specific insight #1 with details and [citations]",
    "Specific insight #2 - include names, tools, or claims [citations]",
    "Specific insight #3 - what's the controversy or hot take? [citations]",
    "Specific insight #4 - any practical implications? [citations]"
  ],
  "citedTweetIds": ["id1", "id2", ...]
}

BAD EXAMPLE (too generic): "Researchers are discussing AI topics and sharing interesting findings."
GOOD EXAMPLE (specific): "@yoavgo argues reward computation belongs in the agent, not environment—flipping decades of RL orthodoxy [id]. Meanwhile @swyx sees gold in RL fine-tuning open weights for specialized agents [id]."`;

  const userPrompt = `Topic: "${topicTitle}"
Number of tweets: ${posts.length}

Create a briefing from these tweets. Extract SPECIFIC insights, names, claims, and debates:

${postsText}`;

  try {
    const response = await grokStrong(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.5,
        response_format: { type: 'json_object' },
      }
    );

    const parsed = parseJsonResponse<BriefingResponse>(response.content);
    
    // Validate cited IDs are real
    const validCitations = parsed.citedTweetIds.filter(id => validIds.has(id));
    
    // Format the output with citations preserved
    const keyPointsText = parsed.keyPoints.map(p => `• ${p}`).join('\n\n');
    const output = `# ${parsed.title}\n\n${parsed.intro}\n\n## Key Points\n\n${keyPointsText}`;

    return {
      id: uuidv4(),
      topicSpaceId: '', // Will be set by caller
      actionType: 'briefing',
      output,
      createdAt: new Date().toISOString(),
      groundedPostIds: validCitations,
    };
  } catch (error) {
    console.error('Error generating briefing:', error);
    throw new Error('Failed to generate briefing');
  }
}

/**
 * Generate a SEGMENTED podcast script for a Topic Space
 * Returns theme-based segments with tweet associations for timeline sync
 */
export async function generatePodcastScript(
  topicTitle: string,
  posts: Post[]
): Promise<{ actionResult: ActionResult; segmentedScript: SegmentedPodcastScript }> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  // Collect handles and create readable name mappings
  const handleToName = new Map<string, string>();
  posts.forEach(p => {
    if (p.authorUsername && p.authorDisplayName) {
      handleToName.set(p.authorUsername.toLowerCase(), p.authorDisplayName);
    }
  });
  const handleMappings = [...handleToName.entries()]
    .slice(0, 15)
    .map(([handle, name]) => `@${handle} → "${name}"`)
    .join(', ');
  
  const systemPrompt = `You are Grok, hosting "Grokcast" - a spoken audio podcast. This will be converted to audio, so write for LISTENING.

=== CRITICAL: WHAT NOT TO DO ===
❌ DO NOT list people's names one after another
❌ DO NOT say "Person X said this, Person Y said that"  
❌ DO NOT mention more than 2-3 names in the ENTIRE podcast
❌ DO NOT summarize individual tweets
❌ DO NOT be a news anchor reading headlines

=== WHAT TO DO INSTEAD ===
✅ Talk about TRENDS and PATTERNS you see
✅ Tell a STORY about what's happening in the space
✅ Use phrases like "teams are hunting for...", "the vibe is...", "what stands out is..."
✅ Give your OPINION and ANALYSIS
✅ Make the listener FEEL the energy, don't list facts

=== EXAMPLE OF BAD (don't do this) ===
"Aaron Lou seeks researchers at OpenAI. Jim Fan hunts robotics experts. Ruiqi Gao wants scientists..."
^ This is a LAUNDRY LIST. Boring. Mechanical.

=== EXAMPLE OF GOOD (do this) ===
"If you walk NeurIPS right now, it feels like a feeding frenzy. Every major lab has recruiters camped out. The message is clear: if you can ship agents that actually work, you're the main character. A year ago everyone wanted foundation model people. Now? It's all about making AI act, not just predict tokens."
^ This is STORYTELLING. Engaging. Opinionated.

=== TTS RULES ===
- Short sentences. One idea each.
- No @handles ever. Say "one researcher" or "a team" instead of names.
- Spell out: "L L M", "G P T", "A I"

=== OUTPUT FORMAT ===
Return JSON with 3-4 segments:

{
  "title": "Catchy 3-6 word title",
  "segments": [
    {
      "segmentId": "intro",
      "segmentType": "intro", 
      "text": "Hey everyone, welcome back to Grokcast! [1-2 sentences setting the vibe]. ...",
      "tweetIds": []
    },
    {
      "segmentId": "theme_1",
      "segmentType": "theme",
      "themeTitle": "The Big Picture Theme",
      "text": "[Talk about the PATTERN you see. What's the story? Why does it matter? Give your take. 4-6 sentences. Don't list names.]",
      "tweetIds": ["id1", "id2", "id3"]
    },
    {
      "segmentId": "theme_2", 
      "segmentType": "theme",
      "themeTitle": "Another Angle",
      "text": "[Another theme or insight. What's interesting or surprising? Your synthesis. 4-6 sentences.]",
      "tweetIds": ["id4", "id5"]
    },
    {
      "segmentId": "wrapup",
      "segmentType": "wrapup",
      "text": "So what's the takeaway? [Your big insight in 1-2 sentences]. That's Grokcast. Catch you next time!",
      "tweetIds": []
    }
  ],
  "mentionedHandles": []
}

Remember: The listener should walk away with 2-3 BIG IDEAS, not a list of 10 people they've never heard of.`;

  const userPrompt = `Topic: "${topicTitle}"
Number of tweets: ${posts.length}

HANDLE TO NAME MAPPING (use these names, not @handles):
${handleMappings || 'Use descriptive references like "one user" if no names available'}

Tweets to discuss:
${postsText}`;

  try {
    console.log(`Generating segmented podcast script for "${topicTitle}" (${posts.length} posts)...`);
    
    const response = await grokStrong(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }
    );

    const parsed = parseJsonResponse<{
      title: string;
      segments: PodcastSegment[];
      mentionedHandles: string[];
    }>(response.content);
    
    // Validate and collect all tweet IDs (cap at 3 per segment for better UX)
    const allTweetIds: string[] = [];
    const validatedSegments = parsed.segments.map(seg => {
      const validTweetIds = seg.tweetIds
        .filter(id => validIds.has(id))
        .slice(0, 3); // Cap at 3 tweets per segment
      allTweetIds.push(...validTweetIds);
      return {
        ...seg,
        tweetIds: validTweetIds,
      };
    });
    
    // Build full script text for display
    const fullScriptText = validatedSegments.map(seg => seg.text).join('\n\n');
    const output = `# 🎙️ Grokcast: ${parsed.title}\n\n${fullScriptText}`;

    const segmentedScript: SegmentedPodcastScript = {
      title: parsed.title,
      segments: validatedSegments,
      mentionedHandles: parsed.mentionedHandles || [],
      allTweetIds: [...new Set(allTweetIds)],
    };

    const actionResult: ActionResult = {
      id: uuidv4(),
      topicSpaceId: '',
      actionType: 'podcast',
      output,
      createdAt: new Date().toISOString(),
      groundedPostIds: segmentedScript.allTweetIds,
    };

    console.log(`Podcast script generated: ${validatedSegments.length} segments, ${segmentedScript.allTweetIds.length} tweets referenced`);

    return { actionResult, segmentedScript };
  } catch (error) {
    console.error('Error generating podcast script:', error);
    throw new Error('Failed to generate podcast script');
  }
}

/**
 * Frontend chat message type for multi-turn conversations
 * (Different from the API ChatMessage which has system role)
 */
interface FrontendChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  groundedPostIds?: string[];
}

/**
 * Answer a question about a Topic Space - with inline citations
 * Supports multi-turn chat by accepting conversation history
 */
export async function answerQuestion(
  topicTitle: string,
  posts: Post[],
  question: string,
  chatHistory?: FrontendChatMessage[]
): Promise<ActionResult> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  const systemPrompt = `You are a helpful AI assistant discussing the topic "${topicTitle}" based on the user's bookmarked tweets. Be conversational, specific and substantive.

CONVERSATION STYLE:
- Be direct and specific - don't hedge unnecessarily
- Include names, claims, and concrete details from the tweets
- If there are different viewpoints, lay them out clearly
- Quote memorable phrases when relevant
- If the tweets don't fully answer the question, say what they DO tell us
- Remember previous messages in the conversation and build on them
- Be conversational and natural - this is a multi-turn chat

CITATION REQUIREMENTS:
- Cite tweets inline using [tweetId] format
- Place citations after claims: "The consensus is X [id1] [id2]."
- ONLY use Tweet IDs from the provided list

OUTPUT (JSON format):
{
  "answer": "Your conversational response with [citations] where relevant",
  "citedTweetIds": ["id1", "id2", ...],
  "confidence": "high" | "medium" | "low"
}

Confidence guide:
- high: Multiple tweets directly address the question
- medium: Some relevant info but not comprehensive  
- low: Tangential mentions only

TWEETS FOR REFERENCE:
${postsText}`;

  // Build messages array with history
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add chat history if provided
  if (chatHistory && chatHistory.length > 0) {
    // Only include the last 10 messages to avoid token limits
    const recentHistory = chatHistory.slice(-10);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content,
      });
    }
  }

  // Add the current question
  messages.push({ role: 'user', content: question });

  try {
    const response = await grokStrong(messages, {
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const parsed = parseJsonResponse<QAResponse>(response.content);
    
    // Validate cited IDs
    const validCitations = parsed.citedTweetIds.filter(id => validIds.has(id));

    return {
      id: uuidv4(),
      topicSpaceId: '',
      actionType: 'qa',
      input: question,
      output: parsed.answer,
      createdAt: new Date().toISOString(),
      groundedPostIds: validCitations,
    };
  } catch (error) {
    console.error('Error answering question:', error);
    throw new Error('Failed to answer question');
  }
}

/**
 * Thread response from Grok
 */
interface ThreadResponse {
  title: string;
  tweets: string[];        // Array of tweets, each ≤280 chars
  relatedTweetIds: string[];
}

/**
 * Generate a Twitter/X thread for a Topic Space
 */
export async function generateThread(
  topicTitle: string,
  posts: Post[]
): Promise<ActionResult> {
  const postsText = formatPostsForPrompt(posts, 25);
  const validIds = getValidTweetIds(posts);
  
  // Collect handles for reference
  const handles = [...new Set(posts.map(p => `@${p.authorUsername}`))];
  
  const systemPrompt = `You are a skilled Twitter/X content creator. Create an engaging thread that summarizes and synthesizes discussions on a topic.

THREAD RULES:
- First tweet should hook readers and introduce the topic (use an emoji or two)
- Each tweet MUST be 280 characters or less (this is critical!)
- Use 5-10 tweets total
- Number tweets like "1/" "2/" etc. at the start
- Reference @handles naturally when crediting ideas
- End with a call to action or thought-provoking question
- Make it shareable and engaging
- Don't use hashtags excessively (max 1-2 per tweet)

STYLE:
- Be concise but insightful
- Use line breaks within tweets for readability
- Include key takeaways and interesting findings
- Credit original authors when mentioning their specific ideas

Return JSON:
{
  "title": "Thread title (not a tweet)",
  "tweets": ["1/ First tweet...", "2/ Second tweet...", ...],
  "relatedTweetIds": ["id1", "id2", ...] // IDs of tweets you synthesized
}`;

  const userPrompt = `Topic: "${topicTitle}"
Number of source tweets: ${posts.length}
Key voices: ${handles.slice(0, 10).join(', ')}

Source tweets to synthesize:
${postsText}`;

  try {
    const response = await grokStrong(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }
    );

    const parsed = parseJsonResponse<ThreadResponse>(response.content);
    
    // Validate related IDs
    const validRelated = parsed.relatedTweetIds.filter(id => validIds.has(id));
    
    // Format output with numbered tweets
    const formattedTweets = parsed.tweets.map((tweet, i) => {
      const charCount = tweet.length;
      const warning = charCount > 280 ? ` ⚠️ (${charCount} chars)` : '';
      return `${tweet}${warning}`;
    }).join('\n\n---\n\n');
    
    const output = `# 🧵 ${parsed.title}\n\n${formattedTweets}`;

    return {
      id: uuidv4(),
      topicSpaceId: '',
      actionType: 'thread',
      output,
      createdAt: new Date().toISOString(),
      groundedPostIds: validRelated,
    };
  } catch (error) {
    console.error('Error generating thread:', error);
    throw new Error('Failed to generate thread');
  }
}

/**
 * Thumbnail analyzer — calls Claude API to score and critique thumbnails.
 * Falls back to mock data when PIPELINE_USE_MOCK=true.
 */

const Anthropic = require('@anthropic-ai/sdk');
const { getMockAnalysis } = require('../mock/claude');

const useMock = process.env.PIPELINE_USE_MOCK === 'true' || !process.env.ANTHROPIC_API_KEY;

const ANALYSIS_PROMPT = `You are a YouTube thumbnail expert. Analyze this thumbnail for a YouTube video and return a JSON object with this exact structure:

{
  "score": <integer 1-10, where 10 = perfect CTR-optimized thumbnail>,
  "strengths": [<3 specific strengths as strings>],
  "problems": [<3 specific problems as strings>],
  "fixes": [<3 actionable fixes corresponding to each problem>],
  "ctrEstimate": <"very low" | "low" | "medium" | "high" | "very high">
}

Video title: {VIDEO_TITLE}

Evaluate on: composition, contrast, text readability, emotional impact, face (if present), clarity at small size.
Return ONLY the JSON object, no markdown, no explanation.`;

/**
 * Analyzes a single thumbnail image URL using Claude.
 * @param {Object} video - { id, title, thumbnailUrl }
 * @param {number} index - position in batch (used for mock cycling)
 * @returns {Object} analysis result
 */
async function analyzeThumbnail(video, index = 0) {
  if (useMock) {
    // Simulate a small delay to mimic API latency
    await new Promise((r) => setTimeout(r, 50));
    return getMockAnalysis(video.id, index);
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = ANALYSIS_PROMPT.replace('{VIDEO_TITLE}', video.title);

  const message = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: video.thumbnailUrl,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ],
  });

  const raw = message.content[0]?.text?.trim();
  if (!raw) throw new Error(`Empty response from Claude for video ${video.id}`);

  try {
    const parsed = JSON.parse(raw);
    return { videoId: video.id, ...parsed };
  } catch {
    throw new Error(`Claude returned non-JSON for video ${video.id}: ${raw.slice(0, 200)}`);
  }
}

/**
 * Analyzes all thumbnails in a batch, in sequence (to respect API rate limits).
 * @param {Array} videos - array of { id, title, thumbnailUrl }
 * @returns {Array} array of analysis objects
 */
async function analyzeAll(videos) {
  const results = [];
  for (let i = 0; i < videos.length; i++) {
    const analysis = await analyzeThumbnail(videos[i], i);
    results.push(analysis);
  }
  return results;
}

module.exports = { analyzeThumbnail, analyzeAll };

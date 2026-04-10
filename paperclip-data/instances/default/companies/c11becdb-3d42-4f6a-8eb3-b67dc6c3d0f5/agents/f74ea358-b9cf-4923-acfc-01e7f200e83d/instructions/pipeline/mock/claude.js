/**
 * Mock Claude API responses for thumbnail analysis.
 * Used when PIPELINE_USE_MOCK=true or ANTHROPIC_API_KEY is absent.
 */

const MOCK_ANALYSES = [
  {
    videoId: 'vid001',
    score: 8,
    strengths: [
      'Strong contrast between subject and background',
      'Clear readable text with high visual hierarchy',
      'Subject making direct eye contact with camera',
    ],
    problems: [
      'Text slightly overlaps subject face reducing readability',
      'Background color too similar to subject clothing',
      'No clear focal point hierarchy — eye struggles to settle',
    ],
    fixes: [
      'Move text to bottom third of frame, leaving face unobstructed',
      'Switch background to a high-contrast complementary color (e.g. deep blue vs orange)',
      'Add subtle drop shadow to text to separate it from background',
    ],
    ctrEstimate: 'high',
  },
  {
    videoId: 'vid002',
    score: 6,
    strengths: [
      'Multiple products shown gives variety signal',
      'Bright color palette catches the eye',
      'Clear title text',
    ],
    problems: [
      'Too many elements competing for attention — cluttered layout',
      'Text too small to read in mobile feed at thumbnail size',
      'No human face — missed opportunity for emotional connection',
    ],
    fixes: [
      'Pick the 1-2 hero products and remove the rest',
      'Increase font size by at least 40%, reduce character count',
      'Add presenter face in bottom-right corner showing excited expression',
    ],
    ctrEstimate: 'medium',
  },
  {
    videoId: 'vid003',
    score: 9,
    strengths: [
      'Expressive face communicates strong emotion immediately',
      'Minimal text maximizes face real estate',
      'High-contrast color grading (desaturated bg, vivid subject)',
    ],
    problems: [
      'Brand logo too prominent — competes with main message',
      'Slight motion blur on subject reduces perceived quality',
      'Text font weight inconsistent with channel brand identity',
    ],
    fixes: [
      'Reduce logo opacity to 30% or relocate to corner',
      'Use a sharper source frame — shoot with higher shutter speed',
      'Standardize to bold condensed sans-serif across all thumbnails',
    ],
    ctrEstimate: 'very high',
  },
];

/**
 * Returns a deterministic mock analysis for a given video.
 * Cycles through MOCK_ANALYSES if more videos than mock entries.
 */
function getMockAnalysis(videoId, index) {
  const base = MOCK_ANALYSES[index % MOCK_ANALYSES.length];
  return { ...base, videoId };
}

module.exports = { MOCK_ANALYSES, getMockAnalysis };

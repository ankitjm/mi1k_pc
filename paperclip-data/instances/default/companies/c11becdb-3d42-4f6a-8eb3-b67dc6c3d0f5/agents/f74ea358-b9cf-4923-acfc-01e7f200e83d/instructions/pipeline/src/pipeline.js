/**
 * Main audit pipeline orchestrator.
 * Input:  channelUrl (string)
 * Output: { channel, videos, analyses, pdfPath }
 */

const path = require('path');
const { resolveChannelId, getChannelInfo, getRecentVideos } = require('./youtube');
const { analyzeAll } = require('./analyzer');
const { generateAuditPDF } = require('./pdf');

const DEFAULT_VIDEOS_COUNT = parseInt(process.env.PIPELINE_VIDEOS_PER_CHANNEL || '10', 10);
const PDF_OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || path.join(__dirname, '../../output/pdfs');

/**
 * Runs the full audit pipeline for a channel URL.
 * @param {string} channelUrl
 * @param {Object} options
 * @param {number} [options.maxVideos]
 * @param {boolean} [options.skipPdf]  skip PDF generation (useful in tests)
 * @returns {Object} { channel, videos, analyses, items, pdfPath }
 */
async function runAudit(channelUrl, { maxVideos = DEFAULT_VIDEOS_COUNT, skipPdf = false } = {}) {
  console.log(`[pipeline] Starting audit for: ${channelUrl}`);

  // 1. Resolve channel
  const channelId = await resolveChannelId(channelUrl);
  console.log(`[pipeline] Channel ID: ${channelId}`);

  // 2. Fetch channel metadata
  const channel = await getChannelInfo(channelId);
  console.log(`[pipeline] Channel: ${channel.title} (${formatNumber(channel.subscriberCount)} subs)`);

  // 3. Fetch recent videos
  const videos = await getRecentVideos(channelId, maxVideos);
  console.log(`[pipeline] Fetched ${videos.length} videos`);

  if (!videos.length) {
    throw new Error(`No videos found for channel: ${channel.title}`);
  }

  // 4. Analyze thumbnails
  console.log('[pipeline] Analyzing thumbnails...');
  const analyses = await analyzeAll(videos);
  console.log(`[pipeline] Analysis complete. Avg score: ${average(analyses.map((a) => a.score)).toFixed(1)}`);

  // 5. Zip videos + analyses
  const items = videos.map((video, i) => ({ video, analysis: analyses[i] }));

  // 6. Generate PDF
  let pdfPath = null;
  if (!skipPdf) {
    const safeTitle = channel.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = Date.now();
    pdfPath = path.join(PDF_OUTPUT_DIR, `${safeTitle}_audit_${timestamp}.pdf`);
    await generateAuditPDF(channel, items, pdfPath);
    console.log(`[pipeline] PDF generated: ${pdfPath}`);
  }

  return { channel, videos, analyses, items, pdfPath };
}

function average(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function formatNumber(n) {
  const num = parseInt(n || '0', 10);
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(0) + 'K';
  return String(num);
}

module.exports = { runAudit };

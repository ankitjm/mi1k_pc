#!/usr/bin/env node
/**
 * ThumbnailOS — Audit PDF Generator
 *
 * Fetches last N thumbnails from a YouTube channel, analyzes each via Claude API,
 * and generates a structured PDF audit report.
 *
 * Output per video: score (1–10), 3 problems, 3 fixes.
 * PDF: cover page, per-video breakdown, recommendations, CTA.
 * Also updates Airtable with audit status.
 *
 * Usage:
 *   node audit-generator.js --channel "https://www.youtube.com/@MrBeast" --name "MrBeast" --email "user@example.com"
 *   node audit-generator.js --channel-id UCX6OQ3DkcsbYNE6H8uQQuVA --name "Test" --email "test@example.com" --videos 5
 *
 * Required env vars:
 *   YOUTUBE_API_KEY
 *   ANTHROPIC_API_KEY
 *   AIRTABLE_API_KEY
 *   AIRTABLE_BASE_ID
 *
 * Required packages:
 *   npm install pdfkit @anthropic-ai/sdk
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

const OUTPUT_DIR = process.env.AUDIT_OUTPUT_DIR || path.join(__dirname, '../output/audits');
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const ANTHROPIC_API_BASE = 'api.anthropic.com';
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

const DEFAULT_VIDEO_COUNT = 10;
const CLAUDE_MODEL = 'claude-opus-4-6'; // Most capable for analysis

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    channelUrl: null,
    channelId: null,
    leadName: null,
    leadEmail: null,
    videoCount: DEFAULT_VIDEO_COUNT,
    dryRun: false,
    outputDir: OUTPUT_DIR,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--channel':    opts.channelUrl   = args[++i]; break;
      case '--channel-id': opts.channelId    = args[++i]; break;
      case '--name':       opts.leadName     = args[++i]; break;
      case '--email':      opts.leadEmail    = args[++i]; break;
      case '--videos':     opts.videoCount   = parseInt(args[++i], 10); break;
      case '--output-dir': opts.outputDir    = args[++i]; break;
      case '--dry-run':    opts.dryRun       = true; break;
      default:
        console.error(`Unknown arg: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!opts.channelUrl && !opts.channelId) {
    console.error('Usage: node audit-generator.js --channel <url> --name <name> --email <email> [--videos N] [--dry-run]');
    process.exit(1);
  }
  if (!opts.leadName || !opts.leadEmail) {
    console.error('--name and --email are required.');
    process.exit(1);
  }

  return opts;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error at ${url}: ${data.slice(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

function httpsPost(hostname, path, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const options = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { reject(new Error(`JSON parse error: ${data.slice(0, 200)}`)); }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (res) => {
      if (res.statusCode === 302 || res.statusCode === 301) {
        file.close();
        return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(destPath); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

// ---------------------------------------------------------------------------
// YouTube helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a channel URL or handle to a channel ID.
 */
async function resolveChannelId(channelUrl) {
  // Handle @username format
  const handleMatch = channelUrl.match(/@([A-Za-z0-9_.-]+)/);
  if (handleMatch) {
    const handle = handleMatch[1];
    const url = `${YOUTUBE_API_BASE}/channels?part=id&forHandle=${encodeURIComponent('@' + handle)}&key=${YOUTUBE_API_KEY}`;
    const data = await get(url);
    if (data.items?.[0]?.id) return data.items[0].id;
    throw new Error(`Could not resolve handle @${handle}`);
  }

  // Handle /channel/UCxxxx format
  const channelIdMatch = channelUrl.match(/\/channel\/(UC[A-Za-z0-9_-]+)/);
  if (channelIdMatch) return channelIdMatch[1];

  // Handle /c/CustomName or /user/Username
  const customMatch = channelUrl.match(/\/(c|user)\/([A-Za-z0-9_.-]+)/);
  if (customMatch) {
    const searchUrl = `${YOUTUBE_API_BASE}/channels?part=id&forUsername=${encodeURIComponent(customMatch[2])}&key=${YOUTUBE_API_KEY}`;
    const data = await get(searchUrl);
    if (data.items?.[0]?.id) return data.items[0].id;
  }

  throw new Error(`Could not resolve channel URL: ${channelUrl}`);
}

/**
 * Fetch the most recent N videos from a channel with thumbnails.
 */
async function getRecentVideos(channelId, count) {
  const searchUrl = `${YOUTUBE_API_BASE}/search?part=id,snippet&channelId=${channelId}&order=date&type=video&maxResults=${count}&key=${YOUTUBE_API_KEY}`;
  const searchData = await get(searchUrl);

  if (searchData.error) throw new Error(`YouTube search error: ${searchData.error.message}`);
  if (!searchData.items?.length) throw new Error('No videos found for this channel.');

  const videoIds = searchData.items.map((i) => i.id.videoId).filter(Boolean).join(',');
  const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
  const statsData = await get(statsUrl);

  if (statsData.error) throw new Error(`YouTube video stats error: ${statsData.error.message}`);

  return statsData.items.map((v) => ({
    videoId: v.id,
    title: v.snippet.title,
    publishedAt: v.snippet.publishedAt,
    thumbnailUrl: v.snippet.thumbnails?.maxres?.url
      || v.snippet.thumbnails?.high?.url
      || v.snippet.thumbnails?.medium?.url,
    viewCount: parseInt(v.statistics.viewCount || '0', 10),
    likeCount: parseInt(v.statistics.likeCount || '0', 10),
    commentCount: parseInt(v.statistics.commentCount || '0', 10),
  }));
}

// ---------------------------------------------------------------------------
// Claude API helpers
// ---------------------------------------------------------------------------

/**
 * Analyze a thumbnail image (as base64) via Claude Vision.
 * Returns: score (1-10), problems (array of 3), fixes (array of 3).
 */
async function analyzeThumbnail(imageBase64, videoTitle, viewCount) {
  const prompt = `You are a YouTube thumbnail expert. Analyze this thumbnail for the video titled: "${videoTitle}" (${viewCount.toLocaleString()} views).

Evaluate it on these dimensions:
1. Composition & visual hierarchy
2. Contrast & color impact
3. Text readability & size
4. Face/emotion effectiveness (if present)
5. Clarity of the core message
6. Click-worthiness for Indian YouTube audience

Respond in this EXACT JSON format (no markdown, just JSON):
{
  "score": <integer 1-10>,
  "summary": "<one sentence overall assessment>",
  "problems": [
    "<specific problem 1>",
    "<specific problem 2>",
    "<specific problem 3>"
  ],
  "fixes": [
    "<actionable fix for problem 1>",
    "<actionable fix for problem 2>",
    "<actionable fix for problem 3>"
  ]
}`;

  const result = await httpsPost(
    ANTHROPIC_API_BASE,
    '/v1/messages',
    {
      model: CLAUDE_MODEL,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    },
    {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    }
  );

  if (result.status !== 200) {
    throw new Error(`Claude API error ${result.status}: ${JSON.stringify(result.body)}`);
  }

  const text = result.body.content?.[0]?.text || '';
  try {
    return JSON.parse(text);
  } catch {
    // Attempt to extract JSON from response
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse Claude response: ${text.slice(0, 200)}`);
  }
}

/**
 * Generate a channel-level summary and top recommendations via Claude.
 */
async function generateChannelSummary(channelName, videoAnalyses) {
  const avgScore = (videoAnalyses.reduce((sum, v) => sum + v.analysis.score, 0) / videoAnalyses.length).toFixed(1);
  const problems = videoAnalyses.flatMap((v) => v.analysis.problems).slice(0, 9);
  const fixes = videoAnalyses.flatMap((v) => v.analysis.fixes).slice(0, 9);

  const prompt = `You are a YouTube growth consultant. A channel called "${channelName}" has an average thumbnail score of ${avgScore}/10.

Common problems found across their thumbnails:
${problems.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Suggested fixes:
${fixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Write a professional 3-sentence channel summary and list the top 3 highest-impact improvements they should make first. Be specific and actionable.

Respond in EXACT JSON (no markdown):
{
  "summary": "<3 sentences>",
  "topRecommendations": [
    "<recommendation 1 with expected impact>",
    "<recommendation 2 with expected impact>",
    "<recommendation 3 with expected impact>"
  ]
}`;

  const result = await httpsPost(
    ANTHROPIC_API_BASE,
    '/v1/messages',
    {
      model: CLAUDE_MODEL,
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    },
    {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    }
  );

  if (result.status !== 200) {
    throw new Error(`Claude summary error ${result.status}: ${JSON.stringify(result.body)}`);
  }

  const text = result.body.content?.[0]?.text || '';
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error(`Could not parse summary: ${text.slice(0, 200)}`);
  }
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

async function generatePDF(opts, channelInfo, videoAnalyses, channelSummary, outputPath) {
  // Lazy-require PDFKit so the script errors cleanly if not installed
  let PDFDocument;
  try {
    PDFDocument = require('pdfkit');
  } catch {
    throw new Error('PDFKit not installed. Run: npm install pdfkit');
  }

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const avgScore = (videoAnalyses.reduce((sum, v) => sum + v.analysis.score, 0) / videoAnalyses.length).toFixed(1);
  const DATE_STR = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  // Brand colors
  const RED = '#E53E3E';
  const DARK = '#1A202C';
  const GRAY = '#718096';
  const LIGHT = '#F7FAFC';

  // ---- Cover page ----
  doc.rect(0, 0, doc.page.width, 180).fill(DARK);
  doc.fillColor('#FFFFFF').fontSize(28).font('Helvetica-Bold')
    .text('ThumbnailOS', 50, 40);
  doc.fontSize(14).font('Helvetica')
    .text('AI-Powered Thumbnail Audit', 50, 75);
  doc.moveTo(50, 105).lineTo(doc.page.width - 50, 105).lineWidth(1).strokeColor(RED).stroke();
  doc.fontSize(11).fillColor('#CBD5E0')
    .text(`Prepared for: ${opts.leadName}  •  ${opts.leadEmail}  •  ${DATE_STR}`, 50, 115);
  doc.fillColor('#FFFFFF').fontSize(16).font('Helvetica-Bold')
    .text(channelInfo.title, 50, 140);

  doc.fillColor(DARK).fontSize(12).font('Helvetica').y = 200;

  // ---- Score banner ----
  doc.roundedRect(50, 200, doc.page.width - 100, 80, 8).fill(LIGHT);
  doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold')
    .text('Overall Thumbnail Score', 70, 215);
  doc.fillColor(parseFloat(avgScore) >= 7 ? '#38A169' : parseFloat(avgScore) >= 4 ? '#D69E2E' : RED)
    .fontSize(36).font('Helvetica-Bold')
    .text(`${avgScore} / 10`, doc.page.width - 160, 210);
  doc.fillColor(GRAY).fontSize(10).font('Helvetica')
    .text(channelSummary.summary, 70, 242, { width: doc.page.width - 180 });

  // ---- Top recommendations ----
  doc.moveDown(2);
  let y = 300;
  doc.fillColor(RED).fontSize(14).font('Helvetica-Bold')
    .text('Top 3 Improvements', 50, y);
  y += 25;
  channelSummary.topRecommendations.forEach((rec, i) => {
    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold')
      .text(`${i + 1}.`, 50, y);
    doc.font('Helvetica').fillColor(DARK)
      .text(rec, 70, y, { width: doc.page.width - 120 });
    y += doc.currentLineHeight() + 16;
  });

  // ---- Per-video breakdowns ----
  doc.addPage();

  videoAnalyses.forEach((item, idx) => {
    const a = item.analysis;
    const scoreColor = a.score >= 7 ? '#38A169' : a.score >= 4 ? '#D69E2E' : RED;

    if (idx > 0) doc.addPage();

    // Video header
    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold')
      .text(`Video ${idx + 1} of ${videoAnalyses.length}`, 50, 50);
    doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold')
      .text(item.title, 50, 68, { width: doc.page.width - 100 });

    // Thumbnail image (if downloaded)
    let thumbY = 68 + doc.currentLineHeight() + 10;
    if (item.localThumbnailPath && fs.existsSync(item.localThumbnailPath)) {
      try {
        doc.image(item.localThumbnailPath, 50, thumbY, { width: 200, height: 113 });
      } catch {
        // Skip if image can't be embedded
      }
    }

    // Score
    doc.fillColor(scoreColor).fontSize(32).font('Helvetica-Bold')
      .text(`${a.score}/10`, doc.page.width - 140, thumbY);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text(`${item.viewCount.toLocaleString()} views`, doc.page.width - 140, thumbY + 45);

    const contentY = thumbY + 130;

    // Summary
    doc.fillColor(GRAY).fontSize(10).font('Helvetica-Oblique')
      .text(a.summary, 50, contentY, { width: doc.page.width - 100 });

    let rowY = contentY + 30;

    // Problems
    doc.fillColor(RED).fontSize(11).font('Helvetica-Bold')
      .text('Problems', 50, rowY);
    rowY += 18;
    a.problems.forEach((p) => {
      doc.fillColor(DARK).fontSize(10).font('Helvetica')
        .text(`• ${p}`, 55, rowY, { width: (doc.page.width - 110) / 2 - 10 });
      rowY += doc.currentLineHeight() + 8;
    });

    // Fixes (column 2)
    let fixY = contentY + 30 + 18;
    const col2X = doc.page.width / 2 + 5;
    doc.fillColor('#38A169').fontSize(11).font('Helvetica-Bold')
      .text('Fixes', col2X, contentY + 30);
    a.fixes.forEach((f) => {
      doc.fillColor(DARK).fontSize(10).font('Helvetica')
        .text(`✓ ${f}`, col2X, fixY, { width: (doc.page.width - 110) / 2 - 10 });
      fixY += doc.currentLineHeight() + 8;
    });
  });

  // ---- CTA page ----
  doc.addPage();
  doc.rect(0, 0, doc.page.width, doc.page.height).fill(DARK);
  doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
    .text('Ready to fix your thumbnails?', 50, 180, { align: 'center', width: doc.page.width - 100 });
  doc.fillColor('#CBD5E0').fontSize(14).font('Helvetica')
    .text('Upgrade to ThumbnailOS Pro and get weekly AI-powered audits,\ndesign feedback, and CTR optimization — all automated.', 50, 230, { align: 'center', width: doc.page.width - 100 });
  doc.fillColor(RED).fontSize(18).font('Helvetica-Bold')
    .text('thumbnailos.in', 50, 310, { align: 'center', width: doc.page.width - 100 });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Airtable helpers
// ---------------------------------------------------------------------------

async function updateAirtable(channelId, leadName, leadEmail, pdfPath, avgScore) {
  const url = `${AIRTABLE_API_BASE}/${AIRTABLE_BASE_ID}/Customers`;
  const payload = {
    fields: {
      'Name': leadName,
      'Email': leadEmail,
      'Channel': `https://www.youtube.com/channel/${channelId}`,
      'Audit Score': parseFloat(avgScore),
      'PDF Path': pdfPath,
      'Status': 'audit_sent',
      'Tier': 'free',
      'MRR': 0,
    },
  };

  const parsed = new URL(url);
  const result = await httpsPost(
    parsed.hostname,
    parsed.pathname,
    payload,
    { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
  );

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Airtable error ${result.status}: ${JSON.stringify(result.body)}`);
  }

  return result.body.id;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (!YOUTUBE_API_KEY) { console.error('❌  YOUTUBE_API_KEY not set'); process.exit(1); }
  if (!ANTHROPIC_API_KEY) { console.error('❌  ANTHROPIC_API_KEY not set'); process.exit(1); }
  if (!opts.dryRun && (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID)) {
    console.error('❌  AIRTABLE_API_KEY and AIRTABLE_BASE_ID required (or use --dry-run)');
    process.exit(1);
  }

  fs.mkdirSync(opts.outputDir, { recursive: true });
  const tmpDir = path.join(opts.outputDir, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });

  console.log(`\n🚀  ThumbnailOS Audit Generator`);
  console.log(`    Lead: ${opts.leadName} <${opts.leadEmail}>`);
  console.log(`    Channel: ${opts.channelUrl || opts.channelId}\n`);

  // Step 1: Resolve channel ID
  let channelId = opts.channelId;
  if (!channelId) {
    process.stdout.write('🔍  Resolving channel ID...');
    channelId = await resolveChannelId(opts.channelUrl);
    console.log(` ${channelId}`);
  }

  // Step 2: Fetch channel info
  process.stdout.write('📡  Fetching channel info...');
  const channelData = await get(
    `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${channelId}&key=${YOUTUBE_API_KEY}`
  );
  if (!channelData.items?.[0]) throw new Error('Channel not found.');
  const channelInfo = {
    title: channelData.items[0].snippet.title,
    subscribers: parseInt(channelData.items[0].statistics.subscriberCount || '0', 10),
  };
  console.log(` ${channelInfo.title} (${channelInfo.subscribers.toLocaleString()} subs)`);

  // Step 3: Fetch recent videos
  process.stdout.write(`📹  Fetching ${opts.videoCount} recent videos...`);
  const videos = await getRecentVideos(channelId, opts.videoCount);
  console.log(` ${videos.length} found`);

  // Step 4: Download thumbnails + analyze via Claude
  console.log('\n🤖  Analyzing thumbnails via Claude...\n');
  const videoAnalyses = [];

  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    process.stdout.write(`  [${i + 1}/${videos.length}] "${v.title.slice(0, 50)}"...`);

    let localThumbnailPath = null;
    let imageBase64 = null;

    if (v.thumbnailUrl) {
      localThumbnailPath = path.join(tmpDir, `${v.videoId}.jpg`);
      try {
        await downloadImage(v.thumbnailUrl, localThumbnailPath);
        imageBase64 = fs.readFileSync(localThumbnailPath).toString('base64');
      } catch (err) {
        console.warn(` [thumbnail download failed: ${err.message}]`);
      }
    }

    let analysis;
    if (imageBase64) {
      analysis = await analyzeThumbnail(imageBase64, v.title, v.viewCount);
    } else {
      // Fallback: text-only analysis
      analysis = {
        score: 5,
        summary: 'Could not load thumbnail for visual analysis.',
        problems: ['Thumbnail unavailable', 'Unable to analyze composition', 'Unable to analyze contrast'],
        fixes: ['Ensure thumbnail is publicly accessible', 'Use high-resolution image (1280x720)', 'Check YouTube channel settings'],
      };
    }

    console.log(` Score: ${analysis.score}/10`);
    videoAnalyses.push({ ...v, analysis, localThumbnailPath });

    // Rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  // Step 5: Generate channel summary
  process.stdout.write('\n📊  Generating channel summary...');
  const channelSummary = await generateChannelSummary(channelInfo.title, videoAnalyses);
  console.log(' done');

  const avgScore = (videoAnalyses.reduce((s, v) => s + v.analysis.score, 0) / videoAnalyses.length).toFixed(1);
  console.log(`\n    Average score: ${avgScore}/10`);

  // Step 6: Generate PDF
  const safeName = opts.leadName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const timestamp = new Date().toISOString().split('T')[0];
  const pdfFilename = `audit-${safeName}-${timestamp}.pdf`;
  const pdfPath = path.join(opts.outputDir, pdfFilename);

  process.stdout.write('📄  Generating PDF...');
  await generatePDF(opts, channelInfo, videoAnalyses, channelSummary, pdfPath);
  console.log(` ${pdfPath}`);

  // Step 7: Update Airtable
  if (opts.dryRun) {
    console.log('\n--dry-run: skipping Airtable update.');
  } else {
    process.stdout.write('💾  Updating Airtable...');
    const airtableId = await updateAirtable(channelId, opts.leadName, opts.leadEmail, pdfPath, avgScore);
    console.log(` ${airtableId}`);
  }

  // Cleanup tmp thumbnails
  try { fs.rmSync(tmpDir, { recursive: true }); } catch { /* ignore */ }

  console.log(`\n✅  Audit complete. PDF: ${pdfPath}\n`);
  return pdfPath;
}

main().catch((err) => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});

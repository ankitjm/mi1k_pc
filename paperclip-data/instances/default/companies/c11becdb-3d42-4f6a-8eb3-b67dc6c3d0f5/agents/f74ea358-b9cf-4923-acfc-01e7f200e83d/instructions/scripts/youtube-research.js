#!/usr/bin/env node
/**
 * ThumbnailOS — YouTube Channel Research Script
 *
 * Searches Indian YouTube channels by keyword/category and subscriber range.
 * Outputs: channel name, URL, subscriber count, avg views, niche, engagement score.
 * Saves results to Airtable Pipeline table.
 *
 * Usage:
 *   node youtube-research.js --keyword "cooking" --min-subs 10000 --max-subs 500000
 *   node youtube-research.js --keyword "finance" --min-subs 50000 --niche "Personal Finance"
 *
 * Required env vars:
 *   YOUTUBE_API_KEY
 *   AIRTABLE_API_KEY
 *   AIRTABLE_BASE_ID
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = process.env.RESEARCH_OUTPUT_DIR || path.join(__dirname, '../output/research');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_TABLE = 'Pipeline';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

// Max channels to return per run (YouTube API quota: 100 units/search)
const MAX_RESULTS = 25;
// Number of recent videos to avg for engagement calc
const RECENT_VIDEO_COUNT = 10;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    keyword: null,
    minSubs: 10_000,
    maxSubs: null,
    niche: null,
    dryRun: false,
    outputCsv: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--keyword':    opts.keyword  = args[++i]; break;
      case '--min-subs':   opts.minSubs  = parseInt(args[++i], 10); break;
      case '--max-subs':   opts.maxSubs  = parseInt(args[++i], 10); break;
      case '--niche':      opts.niche    = args[++i]; break;
      case '--dry-run':    opts.dryRun   = true; break;
      case '--output-csv': opts.outputCsv = true; break;
      default:
        console.error(`Unknown arg: ${args[i]}`);
        process.exit(1);
    }
  }

  if (!opts.keyword) {
    console.error('Usage: node youtube-research.js --keyword <term> [--min-subs N] [--max-subs N] [--niche label] [--dry-run] [--output-csv]');
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
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\nBody: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

function post(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
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
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}\nBody: ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// YouTube API helpers
// ---------------------------------------------------------------------------

/**
 * Search for channels matching keyword. Returns up to MAX_RESULTS channel IDs.
 * Appends "India" to bias results toward Indian creators.
 */
async function searchChannels(keyword) {
  const query = encodeURIComponent(`${keyword} India`);
  const url = `${YOUTUBE_API_BASE}/search?part=snippet&type=channel&q=${query}&maxResults=${MAX_RESULTS}&relevanceLanguage=en&regionCode=IN&key=${YOUTUBE_API_KEY}`;
  const data = await get(url);

  if (data.error) {
    throw new Error(`YouTube search error: ${data.error.message}`);
  }

  return (data.items || []).map((item) => item.id.channelId);
}

/**
 * Fetch channel statistics for an array of channel IDs (batch up to 50).
 */
async function getChannelStats(channelIds) {
  const ids = channelIds.join(',');
  const url = `${YOUTUBE_API_BASE}/channels?part=snippet,statistics,brandingSettings&id=${ids}&key=${YOUTUBE_API_KEY}`;
  const data = await get(url);

  if (data.error) {
    throw new Error(`YouTube channels error: ${data.error.message}`);
  }

  return data.items || [];
}

/**
 * Fetch recent videos for a channel and compute avg views + engagement score.
 * Engagement score = (avgViews / subscriberCount) * 100, capped at 100.
 * This is a proxy for CTR/discoverability (high view-to-sub ratio = YouTube is pushing the content).
 */
async function getEngagementScore(channelId, subscriberCount) {
  const url = `${YOUTUBE_API_BASE}/search?part=id&channelId=${channelId}&order=date&type=video&maxResults=${RECENT_VIDEO_COUNT}&key=${YOUTUBE_API_KEY}`;
  const searchData = await get(url);

  if (searchData.error || !searchData.items?.length) {
    return { avgViews: 0, engagementScore: 0 };
  }

  const videoIds = searchData.items.map((i) => i.id.videoId).filter(Boolean).join(',');
  if (!videoIds) return { avgViews: 0, engagementScore: 0 };

  const statsUrl = `${YOUTUBE_API_BASE}/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
  const statsData = await get(statsUrl);

  if (statsData.error || !statsData.items?.length) {
    return { avgViews: 0, engagementScore: 0 };
  }

  const viewCounts = statsData.items.map((v) => parseInt(v.statistics.viewCount || '0', 10));
  const avgViews = Math.round(viewCounts.reduce((a, b) => a + b, 0) / viewCounts.length);
  const engagementScore = subscriberCount > 0
    ? Math.min(Math.round((avgViews / subscriberCount) * 100 * 10) / 10, 100)
    : 0;

  return { avgViews, engagementScore };
}

// ---------------------------------------------------------------------------
// Airtable helpers
// ---------------------------------------------------------------------------

/**
 * Upsert a channel record into Airtable Pipeline table.
 * Simple create — does not check for duplicates in this version.
 */
async function saveToAirtable(record) {
  const url = `${AIRTABLE_API_BASE}/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE)}`;
  const payload = {
    fields: {
      'Channel Name': record.channelName,
      'Channel URL': record.channelUrl,
      'Subscribers': record.subscribers,
      'Avg Views': record.avgViews,
      'Engagement Score': record.engagementScore,
      'Niche': record.niche,
      'Status': 'new',
      'Last Action': new Date().toISOString().split('T')[0],
    },
  };

  const result = await post(url, payload, {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
  });

  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`Airtable error ${result.status}: ${JSON.stringify(result.body)}`);
  }

  return result.body.id;
}

// ---------------------------------------------------------------------------
// CSV export
// ---------------------------------------------------------------------------

function saveToCsv(records, keyword) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().split('T')[0];
  const safeKeyword = keyword.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  const csvPath = path.join(OUTPUT_DIR, `research-${safeKeyword}-${timestamp}.csv`);

  const headers = ['Channel Name', 'Channel URL', 'Subscribers', 'Avg Views (last 10)', 'Engagement Score (%)', 'Niche', 'Date'];
  const rows = records.map((r) => [
    `"${r.channelName.replace(/"/g, '""')}"`,
    r.channelUrl,
    r.subscribers,
    r.avgViews,
    r.engagementScore,
    `"${(r.niche || '').replace(/"/g, '""')}"`,
    timestamp,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  fs.writeFileSync(csvPath, csv, 'utf8');
  return csvPath;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs();

  if (!YOUTUBE_API_KEY) {
    console.error('❌  YOUTUBE_API_KEY is not set. Export it and re-run.');
    process.exit(1);
  }

  if (!opts.dryRun && (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID)) {
    console.error('❌  AIRTABLE_API_KEY and AIRTABLE_BASE_ID are required unless --dry-run is set.');
    process.exit(1);
  }

  console.log(`\n🔍  Searching YouTube channels: "${opts.keyword}" | subs ${opts.minSubs.toLocaleString()}–${opts.maxSubs?.toLocaleString() ?? '∞'}\n`);

  // Step 1: Search
  const channelIds = await searchChannels(opts.keyword);
  if (!channelIds.length) {
    console.log('No channels found for this keyword.');
    return;
  }

  // Step 2: Fetch stats
  const channels = await getChannelStats(channelIds);

  // Step 3: Filter by subscriber range
  const filtered = channels.filter((ch) => {
    const subs = parseInt(ch.statistics?.subscriberCount || '0', 10);
    if (subs < opts.minSubs) return false;
    if (opts.maxSubs && subs > opts.maxSubs) return false;
    return true;
  });

  if (!filtered.length) {
    console.log(`No channels found in subscriber range ${opts.minSubs.toLocaleString()}–${opts.maxSubs?.toLocaleString() ?? '∞'}.`);
    return;
  }

  console.log(`Found ${filtered.length} channel(s) in range. Fetching engagement data...\n`);

  const results = [];

  for (const ch of filtered) {
    const subs = parseInt(ch.statistics?.subscriberCount || '0', 10);
    const { avgViews, engagementScore } = await getEngagementScore(ch.id, subs);

    const record = {
      channelId: ch.id,
      channelName: ch.snippet?.title || 'Unknown',
      channelUrl: `https://www.youtube.com/channel/${ch.id}`,
      subscribers: subs,
      avgViews,
      engagementScore,
      niche: opts.niche || opts.keyword,
    };

    results.push(record);

    console.log(`  📺  ${record.channelName}`);
    console.log(`       URL:         ${record.channelUrl}`);
    console.log(`       Subscribers: ${subs.toLocaleString()}`);
    console.log(`       Avg Views:   ${avgViews.toLocaleString()}`);
    console.log(`       Eng. Score:  ${engagementScore}%`);
    console.log(`       Niche:       ${record.niche}`);
    console.log('');

    // Rate limit: YouTube API allows 10k units/day; each search = 100 units
    await new Promise((r) => setTimeout(r, 200));
  }

  // Step 4a: Save to CSV if requested
  if (opts.outputCsv && results.length) {
    const csvPath = saveToCsv(results, opts.keyword);
    console.log(`📊  CSV saved: ${csvPath}\n`);
  }

  // Step 4b: Save to Airtable (unless dry run)
  if (opts.dryRun) {
    console.log('--dry-run: skipping Airtable save.');
  } else {
    console.log(`💾  Saving ${results.length} record(s) to Airtable...\n`);
    let saved = 0;
    for (const rec of results) {
      try {
        const airtableId = await saveToAirtable(rec);
        console.log(`  ✅  Saved: ${rec.channelName} → ${airtableId}`);
        saved++;
      } catch (err) {
        console.error(`  ❌  Failed to save ${rec.channelName}: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`\n✅  Done. Saved ${saved}/${results.length} channels to Airtable.\n`);
  }
}

main().catch((err) => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});

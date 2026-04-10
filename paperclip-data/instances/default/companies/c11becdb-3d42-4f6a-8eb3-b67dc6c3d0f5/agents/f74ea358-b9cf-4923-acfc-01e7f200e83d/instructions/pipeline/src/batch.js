#!/usr/bin/env node
/**
 * Batch audit runner.
 * Runs the audit pipeline for N channels concurrently.
 *
 * Usage:
 *   node src/batch.js --input channels.txt --output ./pdfs/
 *   node src/batch.js --input channels.txt --output ./pdfs/ --concurrency 5
 *
 * Input file: one YouTube channel URL per line. Lines starting with # are ignored.
 *
 * Options:
 *   --input       Path to text file with channel URLs (one per line)
 *   --output      Directory to write audit PDFs into
 *   --concurrency Max simultaneous audits (default: 3)
 *   --mock        Force mock mode (sets PIPELINE_USE_MOCK=true)
 */

const fs = require('fs');
const path = require('path');
const { runAudit } = require('./pipeline');

const DEFAULT_CONCURRENCY = 3;

/**
 * Read channel URLs from a text file.
 * Strips blank lines and lines starting with #.
 * @param {string} filePath
 * @returns {string[]}
 */
function readChannelList(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/**
 * Run audits for a list of channels with bounded concurrency.
 * @param {string[]} channels   Channel URLs to audit
 * @param {string}  outputDir   Directory for PDF output
 * @param {Object}  options
 * @param {number}  [options.concurrency=3]  Max simultaneous audits
 * @param {boolean} [options.skipPdf=false]  Skip PDF generation (for tests)
 * @returns {Promise<{url: string, status: 'done'|'failed', pdfPath?: string, error?: string}[]>}
 */
async function runBatch(channels, outputDir, { concurrency = DEFAULT_CONCURRENCY, skipPdf = false } = {}) {
  if (!skipPdf) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const results = [];
  const queue = [...channels];
  let active = 0;
  let index = 0;

  return new Promise((resolve) => {
    function dispatch() {
      while (active < concurrency && queue.length > 0) {
        const url = queue.shift();
        const i = index++;
        active++;

        console.log(`[batch] [${i + 1}/${channels.length}] Starting: ${url}`);

        runAudit(url, { skipPdf })
          .then((result) => {
            console.log(`[batch] [${i + 1}/${channels.length}] Done: ${url} → ${result.pdfPath || 'no-pdf'}`);
            results[i] = { url, status: 'done', pdfPath: result.pdfPath };
          })
          .catch((err) => {
            console.error(`[batch] [${i + 1}/${channels.length}] Failed: ${url} — ${err.message}`);
            results[i] = { url, status: 'failed', error: err.message };
          })
          .finally(() => {
            active--;
            dispatch();
            if (active === 0 && queue.length === 0) {
              resolve(results);
            }
          });
      }
    }

    if (channels.length === 0) {
      resolve([]);
      return;
    }

    dispatch();
  });
}

/**
 * Print a summary table of batch results.
 * @param {Array} results
 */
function printSummary(results) {
  const done = results.filter((r) => r.status === 'done');
  const failed = results.filter((r) => r.status === 'failed');

  console.log('\n── Batch Summary ────────────────────────────');
  console.log(`  Total:  ${results.length}`);
  console.log(`  Done:   ${done.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (done.length > 0) {
    console.log('\nCompleted PDFs:');
    for (const r of done) {
      console.log(`  ✓ ${r.url}`);
      if (r.pdfPath) console.log(`    → ${r.pdfPath}`);
    }
  }

  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const r of failed) {
      console.log(`  ✗ ${r.url}: ${r.error}`);
    }
  }

  console.log('─────────────────────────────────────────────\n');
}

// ── CLI ────────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);

  const get = (flag) => {
    const i = args.indexOf(flag);
    return i !== -1 ? args[i + 1] : null;
  };

  const inputFile = get('--input');
  const outputDir = get('--output') || path.join(__dirname, '../../output/pdfs');
  const concurrency = parseInt(get('--concurrency') || String(DEFAULT_CONCURRENCY), 10);
  const mockMode = args.includes('--mock');

  if (!inputFile) {
    console.error('Usage: node src/batch.js --input channels.txt --output ./pdfs/ [--concurrency 3] [--mock]');
    process.exit(1);
  }

  if (mockMode) {
    process.env.PIPELINE_USE_MOCK = 'true';
  }

  let channels;
  try {
    channels = readChannelList(inputFile);
  } catch (err) {
    console.error(`Failed to read input file "${inputFile}": ${err.message}`);
    process.exit(1);
  }

  if (channels.length === 0) {
    console.log('No channels found in input file. Nothing to do.');
    process.exit(0);
  }

  console.log(`[batch] ${channels.length} channel(s), concurrency=${concurrency}, output=${outputDir}`);
  if (process.env.PIPELINE_USE_MOCK === 'true') {
    console.log('[batch] Running in MOCK mode');
  }

  const results = await runBatch(channels, outputDir, { concurrency });
  printSummary(results);

  const failed = results.filter((r) => r.status === 'failed');
  process.exit(failed.length > 0 ? 1 : 0);
}

// Only run main when this file is executed directly (not required as a module)
if (require.main === module) {
  main();
}

module.exports = { runBatch, readChannelList };

#!/usr/bin/env node
/**
 * CLI entry point for the audit pipeline.
 * Usage: node src/index.js --channel <url>
 */

const { runAudit } = require('./pipeline');

async function main() {
  const args = process.argv.slice(2);
  const channelFlag = args.indexOf('--channel');
  const channelUrl = channelFlag !== -1 ? args[channelFlag + 1] : null;

  if (!channelUrl) {
    console.error('Usage: node src/index.js --channel <youtube-channel-url>');
    console.error('Example: PIPELINE_USE_MOCK=true node src/index.js --channel https://www.youtube.com/@mkbhd');
    process.exit(1);
  }

  try {
    const result = await runAudit(channelUrl);
    console.log('\n── Audit Complete ──────────────────────────');
    console.log(`Channel: ${result.channel.title}`);
    console.log(`Videos analyzed: ${result.videos.length}`);
    console.log(`PDF: ${result.pdfPath}`);
    console.log('\nPer-video scores:');
    for (const { video, analysis } of result.items) {
      console.log(`  [${analysis.score}/10] ${video.title}`);
    }
  } catch (err) {
    console.error('Pipeline error:', err.message);
    process.exit(1);
  }
}

main();

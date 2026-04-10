/**
 * PDF report generator.
 * Input: channel info + array of { video, analysis }
 * Output: PDF file at outputPath
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Brand colors
const COLORS = {
  primary: '#E63946',    // ThumbnailOS red
  dark: '#1D3557',       // Deep navy
  mid: '#457B9D',        // Mid blue
  light: '#A8DADC',      // Light teal
  white: '#FFFFFF',
  offWhite: '#F1FAEE',
  gray: '#6C757D',
  lightGray: '#DEE2E6',
};

const FONTS = {
  title: 'Helvetica-Bold',
  body: 'Helvetica',
  bold: 'Helvetica-Bold',
};

/**
 * Generates audit PDF.
 * @param {Object} channel - channel metadata
 * @param {Array} items - array of { video, analysis }
 * @param {string} outputPath - file path to write PDF
 * @returns {string} outputPath
 */
async function generateAuditPDF(channel, items, outputPath) {
  // Ensure output directory exists
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // ── Cover page ──────────────────────────────────────────────────────────
    drawCoverPage(doc, channel, items);

    // ── Per-video pages ──────────────────────────────────────────────────────
    for (const { video, analysis } of items) {
      doc.addPage();
      drawVideoPage(doc, video, analysis);
    }

    // ── Summary / CTA page ──────────────────────────────────────────────────
    doc.addPage();
    drawSummaryPage(doc, channel, items);

    doc.end();

    stream.on('finish', () => resolve(outputPath));
    stream.on('error', reject);
  });
}

function drawCoverPage(doc, channel, items) {
  // Background header bar
  doc.rect(0, 0, doc.page.width, 200).fill(COLORS.dark);

  // Logo / brand name
  doc.font(FONTS.title).fontSize(28).fillColor(COLORS.primary)
    .text('ThumbnailOS', 50, 40);
  doc.font(FONTS.body).fontSize(12).fillColor(COLORS.light)
    .text('AI-Powered Thumbnail Audit', 50, 76);

  // Channel name
  doc.font(FONTS.title).fontSize(22).fillColor(COLORS.white)
    .text(channel.title, 50, 120, { width: 500 });

  // Channel stats bar
  const avgScore = average(items.map((i) => i.analysis.score));
  doc.font(FONTS.body).fontSize(11).fillColor(COLORS.offWhite)
    .text(`${formatNumber(channel.subscriberCount)} subscribers`, 50, 160)
    .text(`${items.length} videos analyzed`, 250, 160)
    .text(`Avg score: ${avgScore.toFixed(1)}/10`, 420, 160);

  // Date
  doc.font(FONTS.body).fontSize(10).fillColor(COLORS.light)
    .text(`Generated ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 50, 185);

  // Body
  doc.fillColor(COLORS.dark);
  doc.font(FONTS.title).fontSize(16).text("What's inside this report", 50, 230);
  doc.moveDown(0.5);
  doc.font(FONTS.body).fontSize(11).fillColor('#333333').text(
    `We analyzed the ${items.length} most recent thumbnails on your channel using AI. ` +
    `Each thumbnail is scored 1–10 and comes with 3 specific problems and 3 actionable fixes.\n\n` +
    `Improving your thumbnails is the single highest-leverage action you can take to grow your channel. ` +
    `A 1% CTR improvement on a 100K-impression video = 1,000 extra clicks per upload.`,
    { width: 500 }
  );

  // Score summary table
  doc.moveDown(1.5);
  doc.font(FONTS.title).fontSize(13).fillColor(COLORS.dark).text('Score Summary');
  doc.moveDown(0.5);

  for (const { video, analysis } of items) {
    const scoreColor = analysis.score >= 8 ? '#28A745' : analysis.score >= 6 ? '#FFC107' : COLORS.primary;
    const shortTitle = video.title.length > 55 ? video.title.slice(0, 52) + '...' : video.title;
    doc.font(FONTS.body).fontSize(10).fillColor('#333333')
      .text(shortTitle, 50, doc.y, { continued: true, width: 380 });
    doc.font(FONTS.bold).fillColor(scoreColor)
      .text(`${analysis.score}/10`, { align: 'right' });
  }
}

function drawVideoPage(doc, video, analysis) {
  // Header strip
  doc.rect(0, 0, doc.page.width, 60).fill(COLORS.dark);
  doc.font(FONTS.body).fontSize(9).fillColor(COLORS.light)
    .text('ThumbnailOS Audit', 50, 10);
  doc.font(FONTS.title).fontSize(14).fillColor(COLORS.white)
    .text(video.title, 50, 25, { width: 460 });

  // Score badge
  const scoreColor = analysis.score >= 8 ? '#28A745' : analysis.score >= 6 ? '#FFC107' : COLORS.primary;
  doc.rect(doc.page.width - 100, 10, 60, 40).fill(scoreColor);
  doc.font(FONTS.title).fontSize(22).fillColor(COLORS.white)
    .text(`${analysis.score}`, doc.page.width - 95, 15, { width: 50, align: 'center' });
  doc.font(FONTS.body).fontSize(8).fillColor(COLORS.white)
    .text('/10', doc.page.width - 95, 38, { width: 50, align: 'center' });

  let y = 80;

  // Thumbnail URL note (image fetch skipped to avoid network calls in PDF gen)
  doc.rect(50, y, 495, 30).fill(COLORS.offWhite);
  doc.font(FONTS.body).fontSize(9).fillColor(COLORS.gray)
    .text(`Thumbnail: ${video.thumbnailUrl}`, 55, y + 9, { width: 485 });
  y += 45;

  // CTR estimate
  const ctrColors = {
    'very low': '#DC3545', low: '#FD7E14', medium: '#FFC107',
    high: '#28A745', 'very high': '#007BFF',
  };
  doc.rect(50, y, 495, 24).fill(ctrColors[analysis.ctrEstimate] || COLORS.gray);
  doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.white)
    .text(`Estimated CTR Impact: ${analysis.ctrEstimate.toUpperCase()}`, 55, y + 7);
  y += 34;

  // Video stats
  doc.font(FONTS.body).fontSize(9).fillColor(COLORS.gray)
    .text(
      `Views: ${formatNumber(video.viewCount)}  ·  Likes: ${formatNumber(video.likeCount)}  ·  Published: ${formatDate(video.publishedAt)}`,
      50, y
    );
  y += 20;

  // Strengths
  doc.font(FONTS.title).fontSize(12).fillColor('#28A745').text('✓ Strengths', 50, y);
  y += 18;
  for (const s of analysis.strengths) {
    doc.font(FONTS.body).fontSize(10).fillColor('#333333').text(`• ${s}`, 60, y, { width: 480 });
    y += doc.currentLineHeight(true) + 4;
  }
  y += 8;

  // Problems
  doc.font(FONTS.title).fontSize(12).fillColor(COLORS.primary).text('✗ Problems', 50, y);
  y += 18;
  for (let i = 0; i < analysis.problems.length; i++) {
    doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.primary)
      .text(`${i + 1}. `, 60, y, { continued: true });
    doc.font(FONTS.body).fillColor('#333333')
      .text(analysis.problems[i], { width: 475 });
    y = doc.y + 4;
  }
  y += 8;

  // Fixes
  doc.font(FONTS.title).fontSize(12).fillColor(COLORS.mid).text('→ Fixes', 50, y);
  y += 18;
  for (let i = 0; i < analysis.fixes.length; i++) {
    doc.font(FONTS.bold).fontSize(10).fillColor(COLORS.mid)
      .text(`Fix ${i + 1}: `, 60, y, { continued: true });
    doc.font(FONTS.body).fillColor('#333333')
      .text(analysis.fixes[i], { width: 475 });
    y = doc.y + 4;
  }
}

function drawSummaryPage(doc, channel, items) {
  doc.rect(0, 0, doc.page.width, 80).fill(COLORS.primary);
  doc.font(FONTS.title).fontSize(22).fillColor(COLORS.white)
    .text('Your Action Plan', 50, 25);

  const avgScore = average(items.map((i) => i.analysis.score));
  const lowest = items.sort((a, b) => a.analysis.score - b.analysis.score)[0];

  doc.font(FONTS.body).fontSize(12).fillColor(COLORS.dark);
  doc.y = 110;
  doc.text(
    `Your average thumbnail score is ${avgScore.toFixed(1)}/10. ` +
    `Start with your lowest-scoring thumbnail ("${lowest.video.title.slice(0, 50)}...") ` +
    `and apply the fixes above — even a single re-done thumbnail can lift your channel CTR measurably.`,
    50, doc.y, { width: 500 }
  );

  doc.moveDown(1.5);
  doc.font(FONTS.title).fontSize(14).fillColor(COLORS.dark).text('Top 3 universal improvements for this channel:');
  doc.moveDown(0.5);

  // Aggregate most common fixes
  const allFixes = items.flatMap((i) => i.analysis.fixes);
  const topFixes = allFixes.slice(0, 3);
  for (const fix of topFixes) {
    doc.font(FONTS.body).fontSize(11).fillColor('#333333').text(`• ${fix}`, 60, doc.y, { width: 480 });
    doc.moveDown(0.4);
  }

  // CTA
  doc.moveDown(2);
  doc.rect(50, doc.y, 495, 80).fill(COLORS.offWhite);
  const ctaY = doc.y + 15;
  doc.font(FONTS.title).fontSize(14).fillColor(COLORS.dark)
    .text('Want us to implement these fixes for you?', 65, ctaY, { width: 465, align: 'center' });
  doc.font(FONTS.body).fontSize(11).fillColor(COLORS.gray)
    .text('Reply to this email or visit thumbnailos.in to get started.', 65, ctaY + 24, { width: 465, align: 'center' });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

module.exports = { generateAuditPDF };

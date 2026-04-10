#!/usr/bin/env node
/**
 * ThumbnailOS — Demo Audit PDF Generator
 *
 * Generates a sample audit PDF with mock data.
 * Use this to verify PDF output without needing API keys.
 *
 * Usage:
 *   node demo-audit.js
 */

const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../output/audits');

async function generatePDF(opts, channelInfo, videoAnalyses, channelSummary, outputPath) {
  const PDFDocument = require('pdfkit');

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const avgScore = (videoAnalyses.reduce((sum, v) => sum + v.analysis.score, 0) / videoAnalyses.length).toFixed(1);
  const DATE_STR = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  const RED = '#E53E3E';
  const DARK = '#1A202C';
  const GRAY = '#718096';
  const LIGHT = '#F7FAFC';

  // Cover page
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

  // Score banner
  doc.roundedRect(50, 200, doc.page.width - 100, 80, 8).fill(LIGHT);
  doc.fillColor(DARK).fontSize(13).font('Helvetica-Bold')
    .text('Overall Thumbnail Score', 70, 215);
  doc.fillColor(parseFloat(avgScore) >= 7 ? '#38A169' : parseFloat(avgScore) >= 4 ? '#D69E2E' : RED)
    .fontSize(36).font('Helvetica-Bold')
    .text(`${avgScore} / 10`, doc.page.width - 160, 210);
  doc.fillColor(GRAY).fontSize(10).font('Helvetica')
    .text(channelSummary.summary, 70, 242, { width: doc.page.width - 180 });

  // Top recommendations
  let y = 300;
  doc.fillColor(RED).fontSize(14).font('Helvetica-Bold')
    .text('Top 3 Improvements', 50, y);
  y += 25;
  channelSummary.topRecommendations.forEach((rec, i) => {
    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text(`${i + 1}.`, 50, y);
    doc.font('Helvetica').fillColor(DARK).text(rec, 70, y, { width: doc.page.width - 120 });
    y += doc.currentLineHeight() + 16;
  });

  // Per-video breakdowns
  doc.addPage();

  videoAnalyses.forEach((item, idx) => {
    const a = item.analysis;
    const scoreColor = a.score >= 7 ? '#38A169' : a.score >= 4 ? '#D69E2E' : RED;

    if (idx > 0) doc.addPage();

    doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold')
      .text(`Video ${idx + 1} of ${videoAnalyses.length}`, 50, 50);
    doc.fillColor(DARK).fontSize(14).font('Helvetica-Bold')
      .text(item.title, 50, 68, { width: doc.page.width - 100 });

    const thumbY = 68 + doc.currentLineHeight() + 10;
    doc.fillColor(scoreColor).fontSize(32).font('Helvetica-Bold')
      .text(`${a.score}/10`, doc.page.width - 140, thumbY);
    doc.fillColor(GRAY).fontSize(9).font('Helvetica')
      .text(`${item.viewCount.toLocaleString()} views`, doc.page.width - 140, thumbY + 45);

    const contentY = thumbY + 70;
    doc.fillColor(GRAY).fontSize(10).font('Helvetica-Oblique')
      .text(a.summary, 50, contentY, { width: doc.page.width - 100 });

    let rowY = contentY + 30;
    doc.fillColor(RED).fontSize(11).font('Helvetica-Bold').text('Problems', 50, rowY);
    rowY += 18;
    a.problems.forEach((p) => {
      doc.fillColor(DARK).fontSize(10).font('Helvetica')
        .text(`• ${p}`, 55, rowY, { width: (doc.page.width - 110) / 2 - 10 });
      rowY += doc.currentLineHeight() + 8;
    });

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

  // CTA page
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

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const opts = {
    leadName: 'Demo Creator',
    leadEmail: 'demo@thumbnailos.in',
  };

  const channelInfo = {
    title: 'TechWithRahul',
    subscribers: 145000,
  };

  const videoAnalyses = [
    {
      title: 'I Built an AI App in 24 Hours',
      viewCount: 87500,
      analysis: {
        score: 4,
        summary: 'Cluttered layout with too much text obscures the main visual hook.',
        problems: [
          'Text is too small and hard to read on mobile',
          'Background color blends with subject — low contrast',
          'No clear focal point; eye has nowhere to land',
        ],
        fixes: [
          'Reduce text to 3–4 words max, increase font size by 2x',
          'Use dark overlay behind subject or switch background to solid #1A1A2E',
          'Center the subject face with a strong directional gaze toward the title',
        ],
      },
    },
    {
      title: 'Top 10 VS Code Extensions 2026',
      viewCount: 212000,
      analysis: {
        score: 7,
        summary: 'Strong color contrast and readable text — good CTR foundation.',
        problems: [
          'Thumbnail looks similar to 5 competing videos in the same niche',
          'No face or emotion — losing 30–40% potential CTR uplift',
          'Logo watermark occupies prime bottom-right real estate',
        ],
        fixes: [
          'Add a unique color accent (orange or purple) that competitors aren\'t using',
          'Add your face with a surprised/excited expression in the left third',
          'Move or shrink watermark to 20px in corner',
        ],
      },
    },
    {
      title: 'How I Got 100k Subscribers (Honest Story)',
      viewCount: 320000,
      analysis: {
        score: 8,
        summary: 'Excellent emotional face + bold text combination drives strong CTR.',
        problems: [
          'Slight font weight inconsistency between title and subtitle',
          'Background gradient could be more dramatic',
          'Arrow graphic feels dated',
        ],
        fixes: [
          'Unify font to Montserrat ExtraBold throughout',
          'Switch gradient from #2C3E50→#3498DB to #0F0C29→#302B63 for more punch',
          'Replace arrow with a glowing circle or star burst element',
        ],
      },
    },
  ];

  const channelSummary = {
    summary: 'TechWithRahul has solid production quality but inconsistent thumbnail strategy. The top-performing videos show strong emotional hooks, while lower performers suffer from information overload. A consistent visual system would significantly lift channel-wide CTR.',
    topRecommendations: [
      'Establish a channel thumbnail template: consistent font (Montserrat Bold), brand color (#E53E3E accent), and always include a face with emotion — expected CTR lift: +15–25%',
      'Reduce text to 5 words or less on every thumbnail; test A/B on your next 3 uploads',
      'Invest in a custom background set (3–4 solid/gradient options) to build visual brand recognition',
    ],
  };

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(OUTPUT_DIR, `audit-demo-${timestamp}.pdf`);

  process.stdout.write('📄  Generating demo audit PDF...');
  await generatePDF(opts, channelInfo, videoAnalyses, channelSummary, outputPath);
  console.log(` ✅  ${outputPath}`);
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});

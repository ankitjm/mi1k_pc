#!/usr/bin/env node
/**
 * ThumbnailOS — Demo Research Excel Generator
 *
 * Generates a sample channel research Excel file with mock data.
 * Use this to verify Excel output without needing API keys.
 *
 * Usage:
 *   node demo-research.js
 */

const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');

const OUTPUT_DIR = path.join(__dirname, '../output/research');

const MOCK_CHANNELS = [
  { channelName: 'TechWithRahul', channelUrl: 'https://www.youtube.com/@TechWithRahul', subscribers: 145000, avgViews: 42000, engagementScore: 29.0, niche: 'Tech / Programming' },
  { channelName: 'CookingWithPreeti', channelUrl: 'https://www.youtube.com/@CookingWithPreeti', subscribers: 287000, avgViews: 95000, engagementScore: 33.1, niche: 'Food / Cooking' },
  { channelName: 'FinanceKaFunda', channelUrl: 'https://www.youtube.com/@FinanceKaFunda', subscribers: 512000, avgViews: 210000, engagementScore: 41.0, niche: 'Personal Finance' },
  { channelName: 'GamingWithArjun', channelUrl: 'https://www.youtube.com/@GamingWithArjun', subscribers: 73000, avgViews: 18000, engagementScore: 24.7, niche: 'Gaming' },
  { channelName: 'FitnessWithNeha', channelUrl: 'https://www.youtube.com/@FitnessWithNeha', subscribers: 198000, avgViews: 61000, engagementScore: 30.8, niche: 'Health / Fitness' },
  { channelName: 'StudyIQ_Ravi', channelUrl: 'https://www.youtube.com/@StudyIQ_Ravi', subscribers: 340000, avgViews: 88000, engagementScore: 25.9, niche: 'Education' },
  { channelName: 'TravelWithPriya', channelUrl: 'https://www.youtube.com/@TravelWithPriya', subscribers: 92000, avgViews: 34000, engagementScore: 37.0, niche: 'Travel / Lifestyle' },
  { channelName: 'StartupTalksIndia', channelUrl: 'https://www.youtube.com/@StartupTalksIndia', subscribers: 421000, avgViews: 175000, engagementScore: 41.6, niche: 'Business / Entrepreneurship' },
];

async function generateExcel(records, outputPath) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ThumbnailOS';
  wb.created = new Date();

  // ── Sheet 1: Pipeline ──────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Pipeline', { views: [{ state: 'frozen', ySplit: 1 }] });

  ws.columns = [
    { header: 'Channel Name',           key: 'channelName',      width: 28 },
    { header: 'Channel URL',            key: 'channelUrl',       width: 42 },
    { header: 'Subscribers',            key: 'subscribers',      width: 15 },
    { header: 'Avg Views (last 10)',    key: 'avgViews',         width: 18 },
    { header: 'Engagement Score (%)',   key: 'engagementScore',  width: 20 },
    { header: 'Niche',                  key: 'niche',            width: 26 },
    { header: 'Status',                 key: 'status',           width: 12 },
    { header: 'Date Added',             key: 'dateAdded',        width: 14 },
  ];

  // Header row styling
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A202C' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  const today = new Date().toISOString().split('T')[0];

  records.forEach((r) => {
    const row = ws.addRow({
      channelName:     r.channelName,
      channelUrl:      r.channelUrl,
      subscribers:     r.subscribers,
      avgViews:        r.avgViews,
      engagementScore: r.engagementScore,
      niche:           r.niche,
      status:          'new',
      dateAdded:       today,
    });

    // Colour-code engagement score
    const scoreCell = row.getCell('engagementScore');
    if (r.engagementScore >= 35) {
      scoreCell.font = { color: { argb: 'FF38A169' }, bold: true };
    } else if (r.engagementScore >= 25) {
      scoreCell.font = { color: { argb: 'FFD69E2E' } };
    } else {
      scoreCell.font = { color: { argb: 'FFE53E3E' } };
    }

    // Format numbers
    row.getCell('subscribers').numFmt = '#,##0';
    row.getCell('avgViews').numFmt = '#,##0';
    row.getCell('engagementScore').numFmt = '0.0"%"';
  });

  // Auto-filter on header row
  ws.autoFilter = { from: 'A1', to: 'H1' };

  // ── Sheet 2: Summary ───────────────────────────────────────────────────────
  const ws2 = wb.addWorksheet('Summary');

  ws2.getColumn('A').width = 30;
  ws2.getColumn('B').width = 20;

  const titleCell = ws2.getCell('A1');
  titleCell.value = 'ThumbnailOS — Research Summary';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1A202C' } };
  ws2.mergeCells('A1:B1');

  ws2.getCell('A3').value = 'Generated';
  ws2.getCell('B3').value = today;
  ws2.getCell('A4').value = 'Total Channels';
  ws2.getCell('B4').value = records.length;
  ws2.getCell('A5').value = 'Avg Engagement Score';
  ws2.getCell('B5').value = (records.reduce((s, r) => s + r.engagementScore, 0) / records.length).toFixed(1) + '%';
  ws2.getCell('A6').value = 'Avg Subscribers';
  ws2.getCell('B6').value = Math.round(records.reduce((s, r) => s + r.subscribers, 0) / records.length).toLocaleString();
  ws2.getCell('A7').value = 'Top Channel by Engagement';
  const top = records.reduce((best, r) => r.engagementScore > best.engagementScore ? r : best, records[0]);
  ws2.getCell('B7').value = top.channelName + ' (' + top.engagementScore + '%)';

  ['A3','A4','A5','A6','A7'].forEach((c) => { ws2.getCell(c).font = { bold: true }; });

  await wb.xlsx.writeFile(outputPath);
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(OUTPUT_DIR, `research-demo-${timestamp}.xlsx`);

  process.stdout.write('📊  Generating demo research Excel...');
  await generateExcel(MOCK_CHANNELS, outputPath);
  console.log(` ✅  ${outputPath}`);
  console.log(`     ${MOCK_CHANNELS.length} channels • 2 sheets (Pipeline + Summary)`);
}

main().catch((err) => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});

/**
 * Integration tests for the full audit pipeline (mock mode, no PDF).
 * Run: node --test tests/pipeline.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.PIPELINE_USE_MOCK = 'true';

const { runAudit } = require('../src/pipeline');

describe('Pipeline end-to-end (mock mode)', () => {
  it('runs full audit and returns expected shape', async () => {
    const result = await runAudit('https://www.youtube.com/@mkbhd', { skipPdf: true });

    // Channel
    assert.ok(result.channel, 'should have channel');
    assert.ok(result.channel.id, 'channel should have id');
    assert.ok(result.channel.title, 'channel should have title');

    // Videos
    assert.ok(Array.isArray(result.videos), 'videos should be array');
    assert.ok(result.videos.length > 0, 'should have videos');

    // Analyses
    assert.ok(Array.isArray(result.analyses), 'analyses should be array');
    assert.equal(result.analyses.length, result.videos.length, 'should have one analysis per video');

    // Items
    assert.ok(Array.isArray(result.items), 'items should be array');
    for (const item of result.items) {
      assert.ok(item.video, 'item should have video');
      assert.ok(item.analysis, 'item should have analysis');
      assert.equal(typeof item.analysis.score, 'number');
    }
  });

  it('respects maxVideos option', async () => {
    const result = await runAudit('https://www.youtube.com/@mkbhd', {
      maxVideos: 2,
      skipPdf: true,
    });

    assert.ok(result.videos.length <= 2, 'should not exceed maxVideos');
  });

  it('pdfPath is null when skipPdf is true', async () => {
    const result = await runAudit('https://www.youtube.com/@mkbhd', { skipPdf: true });
    assert.equal(result.pdfPath, null);
  });

  it('handles @handle URL format', async () => {
    const result = await runAudit('@mkbhd', { skipPdf: true });
    assert.ok(result.channel.id, 'should resolve channel from bare handle');
  });

  it('all analysis scores are in valid range', async () => {
    const result = await runAudit('https://www.youtube.com/@mkbhd', { skipPdf: true });
    for (const { analysis } of result.items) {
      assert.ok(
        analysis.score >= 1 && analysis.score <= 10,
        `Score ${analysis.score} out of range 1-10`
      );
    }
  });
});

/**
 * Unit tests for the batch audit runner.
 * Run: node --test tests/batch.test.js
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Force mock mode before requiring pipeline modules
process.env.PIPELINE_USE_MOCK = 'true';

const { runBatch, readChannelList } = require('../src/batch');

const MOCK_CHANNELS = [
  'https://www.youtube.com/@mkbhd',
  'https://www.youtube.com/@techlinked',
  'https://www.youtube.com/@linustechtips',
  'https://www.youtube.com/@marques',
  'https://www.youtube.com/@unboxtherapy',
];

describe('readChannelList', () => {
  let tmpFile;

  before(() => {
    tmpFile = path.join(os.tmpdir(), `channels_test_${Date.now()}.txt`);
    fs.writeFileSync(
      tmpFile,
      [
        '# This is a comment',
        'https://www.youtube.com/@mkbhd',
        '',
        '  https://www.youtube.com/@techlinked  ',
        '# another comment',
        'https://www.youtube.com/@linustechtips',
      ].join('\n')
    );
  });

  it('reads URLs and strips comments and blank lines', () => {
    const channels = readChannelList(tmpFile);
    assert.equal(channels.length, 3);
    assert.equal(channels[0], 'https://www.youtube.com/@mkbhd');
    assert.equal(channels[1], 'https://www.youtube.com/@techlinked');
    assert.equal(channels[2], 'https://www.youtube.com/@linustechtips');
  });
});

describe('runBatch', () => {
  it('returns one result per channel', async () => {
    const results = await runBatch(MOCK_CHANNELS, '/tmp/pdfs', { skipPdf: true });
    assert.equal(results.length, MOCK_CHANNELS.length);
  });

  it('all results have status done in mock mode', async () => {
    const results = await runBatch(MOCK_CHANNELS, '/tmp/pdfs', { skipPdf: true });
    for (const r of results) {
      assert.equal(r.status, 'done', `Expected done for ${r.url}, got: ${r.status} (${r.error})`);
    }
  });

  it('results preserve order matching input channels', async () => {
    const results = await runBatch(MOCK_CHANNELS, '/tmp/pdfs', { skipPdf: true, concurrency: 2 });
    for (let i = 0; i < MOCK_CHANNELS.length; i++) {
      assert.equal(results[i].url, MOCK_CHANNELS[i], `Result[${i}] url mismatch`);
    }
  });

  it('respects concurrency limit (does not crash with concurrency 1)', async () => {
    const results = await runBatch(MOCK_CHANNELS.slice(0, 3), '/tmp/pdfs', {
      concurrency: 1,
      skipPdf: true,
    });
    assert.equal(results.length, 3);
    for (const r of results) {
      assert.equal(r.status, 'done');
    }
  });

  it('handles empty channel list', async () => {
    const results = await runBatch([], '/tmp/pdfs', { skipPdf: true });
    assert.deepEqual(results, []);
  });

  it('each result has url field', async () => {
    const results = await runBatch(MOCK_CHANNELS.slice(0, 2), '/tmp/pdfs', { skipPdf: true });
    for (const r of results) {
      assert.ok(r.url, 'result should have url');
    }
  });
});

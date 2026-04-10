/**
 * Unit tests for thumbnail analyzer (mock mode).
 * Run: node --test tests/analyzer.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.PIPELINE_USE_MOCK = 'true';

const { analyzeThumbnail, analyzeAll } = require('../src/analyzer');

const SAMPLE_VIDEO = {
  id: 'test123',
  title: 'iPhone 16 Pro Review',
  thumbnailUrl: 'https://i.ytimg.com/vi/test123/maxresdefault.jpg',
};

describe('Analyzer (mock mode)', () => {
  it('analyzeThumbnail returns valid analysis shape', async () => {
    const result = await analyzeThumbnail(SAMPLE_VIDEO, 0);

    assert.equal(typeof result.videoId, 'string');
    assert.equal(typeof result.score, 'number');
    assert.ok(result.score >= 1 && result.score <= 10, 'score should be 1-10');

    assert.ok(Array.isArray(result.strengths), 'strengths should be array');
    assert.ok(Array.isArray(result.problems), 'problems should be array');
    assert.ok(Array.isArray(result.fixes), 'fixes should be array');

    assert.equal(result.strengths.length, 3, 'should have 3 strengths');
    assert.equal(result.problems.length, 3, 'should have 3 problems');
    assert.equal(result.fixes.length, 3, 'should have 3 fixes');

    const validCtr = ['very low', 'low', 'medium', 'high', 'very high'];
    assert.ok(validCtr.includes(result.ctrEstimate), `ctrEstimate should be one of: ${validCtr.join(', ')}`);
  });

  it('analyzeAll processes multiple videos', async () => {
    const videos = [
      { id: 'v1', title: 'Video 1', thumbnailUrl: 'https://example.com/1.jpg' },
      { id: 'v2', title: 'Video 2', thumbnailUrl: 'https://example.com/2.jpg' },
      { id: 'v3', title: 'Video 3', thumbnailUrl: 'https://example.com/3.jpg' },
    ];

    const results = await analyzeAll(videos);

    assert.equal(results.length, 3, 'should return one result per video');
    for (let i = 0; i < results.length; i++) {
      assert.equal(results[i].videoId, videos[i].id, `result[${i}].videoId should match`);
      assert.equal(typeof results[i].score, 'number');
    }
  });

  it('analyzeAll handles empty array', async () => {
    const results = await analyzeAll([]);
    assert.deepEqual(results, []);
  });

  it('mock cycles through analyses for large batches', async () => {
    const videos = Array.from({ length: 6 }, (_, i) => ({
      id: `v${i}`,
      title: `Video ${i}`,
      thumbnailUrl: `https://example.com/${i}.jpg`,
    }));

    const results = await analyzeAll(videos);
    assert.equal(results.length, 6);

    // Scores should be valid for all (mock cycles)
    for (const r of results) {
      assert.ok(r.score >= 1 && r.score <= 10);
    }
  });
});

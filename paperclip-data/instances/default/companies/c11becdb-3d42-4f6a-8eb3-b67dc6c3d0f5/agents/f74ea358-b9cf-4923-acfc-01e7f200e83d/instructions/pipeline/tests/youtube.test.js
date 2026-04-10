/**
 * Unit tests for YouTube client (mock mode).
 * Run: node --test tests/youtube.test.js
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

// Force mock mode for all tests
process.env.PIPELINE_USE_MOCK = 'true';

const { resolveChannelId, getChannelInfo, getRecentVideos, searchChannels } = require('../src/youtube');

describe('YouTube client (mock mode)', () => {
  it('resolveChannelId returns a channel ID string', async () => {
    const id = await resolveChannelId('https://www.youtube.com/@mkbhd');
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0, 'channel ID should not be empty');
  });

  it('getChannelInfo returns expected shape', async () => {
    const id = await resolveChannelId('https://www.youtube.com/@mkbhd');
    const channel = await getChannelInfo(id);

    assert.ok(channel.id, 'should have id');
    assert.ok(channel.title, 'should have title');
    assert.ok(channel.subscriberCount, 'should have subscriberCount');
    assert.ok(channel.videoCount, 'should have videoCount');
  });

  it('getRecentVideos returns array of videos', async () => {
    const id = await resolveChannelId('https://www.youtube.com/@mkbhd');
    const videos = await getRecentVideos(id, 3);

    assert.ok(Array.isArray(videos), 'should be an array');
    assert.ok(videos.length > 0, 'should have at least one video');
    assert.ok(videos.length <= 3, 'should respect maxResults');
  });

  it('each video has required fields', async () => {
    const id = await resolveChannelId('https://www.youtube.com/@mkbhd');
    const videos = await getRecentVideos(id);

    for (const v of videos) {
      assert.ok(v.id, `video ${v.id} should have id`);
      assert.ok(v.title, `video ${v.id} should have title`);
      assert.ok(v.thumbnailUrl, `video ${v.id} should have thumbnailUrl`);
      assert.ok(v.publishedAt, `video ${v.id} should have publishedAt`);
    }
  });

  it('searchChannels returns array', async () => {
    const results = await searchChannels('tech review');
    assert.ok(Array.isArray(results), 'should return an array');
    assert.ok(results.length > 0, 'should return at least one result');
    assert.ok(results[0].channelId, 'each result should have channelId');
  });
});

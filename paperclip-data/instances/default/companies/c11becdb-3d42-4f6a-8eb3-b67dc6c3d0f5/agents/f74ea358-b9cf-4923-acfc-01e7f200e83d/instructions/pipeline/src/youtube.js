/**
 * YouTube Data API v3 client.
 * Falls back to mock data when PIPELINE_USE_MOCK=true.
 */

const axios = require('axios');
const { MOCK_CHANNEL, MOCK_VIDEOS, MOCK_CHANNEL_SEARCH } = require('../mock/youtube');

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const useMock = process.env.PIPELINE_USE_MOCK === 'true' || !process.env.YOUTUBE_API_KEY;

/**
 * Resolves a channel URL or handle to a channel ID.
 * Supports: https://youtube.com/@handle, https://youtube.com/channel/UC..., bare handles
 */
async function resolveChannelId(channelUrl) {
  if (useMock) {
    return MOCK_CHANNEL.id;
  }

  const url = channelUrl.trim();

  // Direct channel ID
  const channelIdMatch = url.match(/youtube\.com\/channel\/(UC[\w-]+)/);
  if (channelIdMatch) return channelIdMatch[1];

  // Handle (@username)
  const handleMatch = url.match(/youtube\.com\/@([\w.-]+)/) || url.match(/^@?([\w.-]+)$/);
  if (handleMatch) {
    const handle = handleMatch[1];
    const res = await axios.get(`${BASE_URL}/channels`, {
      params: {
        key: process.env.YOUTUBE_API_KEY,
        forHandle: `@${handle}`,
        part: 'id',
      },
    });
    const items = res.data.items || [];
    if (!items.length) throw new Error(`Channel not found for handle: @${handle}`);
    return items[0].id;
  }

  throw new Error(`Cannot resolve channel ID from URL: ${channelUrl}`);
}

/**
 * Fetches channel metadata by channel ID.
 */
async function getChannelInfo(channelId) {
  if (useMock) return { ...MOCK_CHANNEL, id: channelId };

  const res = await axios.get(`${BASE_URL}/channels`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      id: channelId,
      part: 'snippet,statistics',
    },
  });

  const item = (res.data.items || [])[0];
  if (!item) throw new Error(`Channel not found: ${channelId}`);

  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    subscriberCount: item.statistics.subscriberCount,
    videoCount: item.statistics.videoCount,
    viewCount: item.statistics.viewCount,
    country: item.snippet.country,
    customUrl: item.snippet.customUrl,
    thumbnailUrl: item.snippet.thumbnails?.high?.url,
  };
}

/**
 * Fetches the N most recent videos for a channel.
 */
async function getRecentVideos(channelId, maxResults = 10) {
  if (useMock) return MOCK_VIDEOS.slice(0, maxResults);

  // Step 1: get upload playlist ID
  const chanRes = await axios.get(`${BASE_URL}/channels`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      id: channelId,
      part: 'contentDetails',
    },
  });

  const uploadsPlaylistId =
    chanRes.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsPlaylistId) throw new Error(`No uploads playlist for channel: ${channelId}`);

  // Step 2: get recent video IDs from playlist
  const playlistRes = await axios.get(`${BASE_URL}/playlistItems`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      playlistId: uploadsPlaylistId,
      part: 'contentDetails',
      maxResults,
    },
  });

  const videoIds = (playlistRes.data.items || []).map(
    (item) => item.contentDetails.videoId
  );

  if (!videoIds.length) return [];

  // Step 3: get video details (stats + thumbnails)
  const videosRes = await axios.get(`${BASE_URL}/videos`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      id: videoIds.join(','),
      part: 'snippet,statistics,contentDetails',
    },
  });

  return (videosRes.data.items || []).map((item) => ({
    id: item.id,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl:
      item.snippet.thumbnails?.maxres?.url ||
      item.snippet.thumbnails?.high?.url,
    viewCount: item.statistics.viewCount,
    likeCount: item.statistics.likeCount,
    commentCount: item.statistics.commentCount,
    duration: item.contentDetails.duration,
  }));
}

/**
 * Searches for channels by keyword (for outreach research).
 */
async function searchChannels(keyword, { minSubscribers = 10000, maxResults = 20 } = {}) {
  if (useMock) return MOCK_CHANNEL_SEARCH;

  const res = await axios.get(`${BASE_URL}/search`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      q: keyword,
      type: 'channel',
      part: 'snippet',
      maxResults,
      regionCode: 'IN',
      relevanceLanguage: 'en',
    },
  });

  const channelIds = (res.data.items || []).map((item) => item.id.channelId);
  if (!channelIds.length) return [];

  const detailRes = await axios.get(`${BASE_URL}/channels`, {
    params: {
      key: process.env.YOUTUBE_API_KEY,
      id: channelIds.join(','),
      part: 'snippet,statistics',
    },
  });

  return (detailRes.data.items || [])
    .filter((item) => parseInt(item.statistics.subscriberCount || '0') >= minSubscribers)
    .map((item) => ({
      channelId: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      subscriberCount: item.statistics.subscriberCount,
      thumbnailUrl: item.snippet.thumbnails?.high?.url,
    }));
}

module.exports = { resolveChannelId, getChannelInfo, getRecentVideos, searchChannels };

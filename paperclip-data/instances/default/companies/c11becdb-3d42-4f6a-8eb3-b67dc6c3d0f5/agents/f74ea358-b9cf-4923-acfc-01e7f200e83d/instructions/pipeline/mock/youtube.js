/**
 * Mock YouTube Data API v3 responses.
 * Used when PIPELINE_USE_MOCK=true or YOUTUBE_API_KEY is absent.
 */

const MOCK_CHANNEL = {
  id: 'UCBcRF18a7Qf58cCRy5xuWwQ',
  title: 'MKBHD',
  description: 'Quality Tech Videos | Marquess Brownlee',
  subscriberCount: '18200000',
  videoCount: '1500',
  viewCount: '3800000000',
  country: 'US',
  customUrl: '@mkbhd',
  thumbnailUrl: 'https://yt3.ggpht.com/mock-channel-thumb.jpg',
};

const MOCK_VIDEOS = [
  {
    id: 'vid001',
    title: 'iPhone 16 Pro Review: A Huge Leap!',
    publishedAt: '2025-09-20T14:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/vid001/maxresdefault.jpg',
    viewCount: '4200000',
    likeCount: '95000',
    commentCount: '8200',
    duration: 'PT18M32S',
  },
  {
    id: 'vid002',
    title: 'The BEST Laptops of 2025!',
    publishedAt: '2025-08-15T14:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/vid002/maxresdefault.jpg',
    viewCount: '2800000',
    likeCount: '61000',
    commentCount: '5100',
    duration: 'PT22M15S',
  },
  {
    id: 'vid003',
    title: 'Why I Switched Back to Android',
    publishedAt: '2025-07-10T14:00:00Z',
    thumbnailUrl: 'https://i.ytimg.com/vi/vid003/maxresdefault.jpg',
    viewCount: '5100000',
    likeCount: '112000',
    commentCount: '14300',
    duration: 'PT12M48S',
  },
];

const MOCK_CHANNEL_SEARCH = [
  {
    channelId: 'UCBcRF18a7Qf58cCRy5xuWwQ',
    title: 'MKBHD',
    description: 'Quality Tech Videos',
    subscriberCount: '18200000',
    thumbnailUrl: 'https://yt3.ggpht.com/mock-channel-thumb.jpg',
  },
];

module.exports = { MOCK_CHANNEL, MOCK_VIDEOS, MOCK_CHANNEL_SEARCH };

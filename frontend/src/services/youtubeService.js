const YOUTUBE_API_KEY = (import.meta.env && import.meta.env.VITE_YOUTUBE_API_KEY) || 'AIzaSyA-LasNGo1npF8LnaAnqe5Z21DZVYufqSY';
const FALLBACK_CHANNEL_ID = 'UCfBx2Jiac84Rgpgku52CgwX';

/**
 * Parses an ISO 8601 duration string (e.g. PT5M30S) into a readable format (e.g. 5:30)
 */
export const parseISO8601Duration = (duration) => {
  if (!duration) return '0:00';
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const seconds = match[3] ? parseInt(match[3]) : 0;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Resolves a YouTube channel handle (e.g. @king24x7) to its Channel ID
 */
export const resolveHandleToChannelId = async (handle) => {
  const apiKey = YOUTUBE_API_KEY || 'AIzaSyA-LasNGo1npF8LnaAnqe5Z21DZVYufqSY';
  const handleQuery = handle.startsWith('@') ? handle : `@${handle}`;
  const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handleQuery)}&key=${apiKey}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return data.items[0].id;
    }
    return FALLBACK_CHANNEL_ID;
  } catch (error) {
    console.warn("Failed to resolve YouTube handle, falling back to default ID:", error);
    return FALLBACK_CHANNEL_ID;
  }
};

/**
 * Fetches the latest 20 videos from a YouTube channel
 */
export const fetchChannelVideos = async (channelId, maxResults = 20) => {
  const apiKey = YOUTUBE_API_KEY || 'AIzaSyA-LasNGo1npF8LnaAnqe5Z21DZVYufqSY';
  
  // 1. Fetch the uploads playlist ID for the channel
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`;
  const channelRes = await fetch(channelUrl);
  if (!channelRes.ok) {
    throw new Error(`Failed to fetch channel details. YouTube API responded with status ${channelRes.status}`);
  }
  
  const channelData = await channelRes.json();
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error("No channel found matching the provided Channel ID.");
  }
  
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
  if (!uploadsPlaylistId) {
    throw new Error("Uploads playlist ID not found for this channel.");
  }

  // 2. Fetch the latest items from the uploads playlist
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${maxResults}&key=${apiKey}`;
  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) {
    throw new Error(`Failed to fetch playlist items. YouTube API responded with status ${playlistRes.status}`);
  }
  
  const playlistData = await playlistRes.json();
  if (!playlistData.items || playlistData.items.length === 0) {
    return [];
  }

  // Extract all video IDs to query details in a single batch
  const videoIds = playlistData.items.map(item => item.snippet.resourceId.videoId).filter(Boolean);
  if (videoIds.length === 0) {
    return [];
  }

  // 3. Query video details to get duration and actual live broadcast status
  const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds.join(',')}&key=${apiKey}`;
  const videosRes = await fetch(videosUrl);
  if (!videosRes.ok) {
    throw new Error(`Failed to fetch video details. YouTube API responded with status ${videosRes.status}`);
  }
  
  const videosData = await videosRes.json();
  const videoDetailsMap = {};
  if (videosData.items) {
    videosData.items.forEach(item => {
      videoDetailsMap[item.id] = {
        duration: parseISO8601Duration(item.contentDetails?.duration),
        isLive: item.snippet?.liveBroadcastContent === 'live'
      };
    });
  }

  // Map playlist items to unified video objects
  return playlistData.items.map(item => {
    const videoId = item.snippet.resourceId.videoId;
    const details = videoDetailsMap[videoId] || { duration: '0:00', isLive: false };
    const thumbnails = item.snippet.thumbnails;
    
    return {
      id: videoId,
      title: item.snippet.title,
      description: item.snippet.description || '',
      publishedAt: item.snippet.publishedAt,
      thumbnailUrl: thumbnails?.high?.url || thumbnails?.medium?.url || thumbnails?.standard?.url || thumbnails?.default?.url,
      duration: details.duration,
      isLive: details.isLive,
      youtubeUrl: `https://www.youtube.com/embed/${videoId}`
    };
  });
};

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    if (!YOUTUBE_API_KEY) {
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const channelUsername = 'KnowRISKio';
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    
    // First, get the channel ID from the username
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${channelUsername}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!channelResponse.ok) {
      console.error('YouTube API error:', await channelResponse.text());
      throw new Error('Failed to fetch channel data');
    }
    
    const channelData = await channelResponse.json();
    
    if (!channelData.items || channelData.items.length === 0) {
      // Try searching by custom URL handle
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=@${channelUsername}&key=${YOUTUBE_API_KEY}`
      );
      
      if (!searchResponse.ok) {
        throw new Error('Failed to search for channel');
      }
      
      const searchData = await searchResponse.json();
      if (!searchData.items || searchData.items.length === 0) {
        throw new Error('Channel not found');
      }
      
      const channelId = searchData.items[0].snippet.channelId;
      
      // Get latest videos from the channel
      const searchQuery = category ? `&q=${encodeURIComponent(category)}` : '';
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=12${searchQuery}&key=${YOUTUBE_API_KEY}`
      );
      
      if (!videosResponse.ok) {
        throw new Error('Failed to fetch videos');
      }
      
      const videosData = await videosResponse.json();
      
      return new Response(JSON.stringify({ videos: videosData.items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const channelId = channelData.items[0].id;
    
    // Get latest videos from the channel
    const searchQuery = category ? `&q=${encodeURIComponent(category)}` : '';
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=12${searchQuery}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!videosResponse.ok) {
      throw new Error('Failed to fetch videos');
    }
    
    const videosData = await videosResponse.json();
    
    console.log('Successfully fetched YouTube videos:', videosData.items?.length || 0);
    
    return new Response(JSON.stringify({ videos: videosData.items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in youtube-videos function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

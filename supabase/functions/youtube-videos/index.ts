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
      console.error('YOUTUBE_API_KEY not configured in environment');
      throw new Error('YOUTUBE_API_KEY not configured');
    }

    const channelHandle = '@KnowRISKio';
    
    // Parse category from request body or query params
    let category = '';
    try {
      const body = await req.json();
      category = body.category || '';
    } catch {
      const url = new URL(req.url);
      category = url.searchParams.get('category') || '';
    }
    
    console.log(`Fetching YouTube videos for ${channelHandle}, category: "${category}"`);
    
    // Use channel handle to search for the channel ID
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(channelHandle)}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('YouTube API channel search error:', errorText);
      if (errorText.includes('quotaExceeded')) {
        return new Response(JSON.stringify({ videos: [], error: 'quotaExceeded' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`YouTube API error: ${searchResponse.status} - ${errorText}`);
    }
    
    const searchData = await searchResponse.json();
    console.log('Channel search response:', JSON.stringify(searchData, null, 2));
    
    if (!searchData.items || searchData.items.length === 0) {
      console.error('Channel not found for handle:', channelHandle);
      throw new Error('Channel not found');
    }
    
    const channelId = searchData.items[0].snippet.channelId || searchData.items[0].id?.channelId;
    console.log('Found channel ID:', channelId);
    
    if (!channelId) {
      throw new Error('Could not extract channel ID');
    }
    
    // Get latest videos from the channel
    const searchQuery = category ? `&q=${encodeURIComponent(category)}` : '';
    const videosUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=12${searchQuery}&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching videos from:', videosUrl.replace(YOUTUBE_API_KEY, 'API_KEY'));
    
    const videosResponse = await fetch(videosUrl);
    
    if (!videosResponse.ok) {
      const errorText = await videosResponse.text();
      console.error('YouTube API videos error:', errorText);
      if (errorText.includes('quotaExceeded')) {
        return new Response(JSON.stringify({ videos: [], error: 'quotaExceeded' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Failed to fetch videos: ${videosResponse.status} - ${errorText}`);
    }
    
    const videosData = await videosResponse.json();
    console.log('Successfully fetched YouTube videos:', videosData.items?.length || 0);
    
    return new Response(JSON.stringify({ videos: videosData.items || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in youtube-videos function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? error.stack : '';
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: errorDetails 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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

    // Hardcoded channel ID for @KnowRISKio (UC prefix means channel, UU prefix is uploads playlist)
    const channelId = 'UCzXJXLFv5_ybFQqr3TZkqJw';
    const uploadsPlaylistId = 'UUzXJXLFv5_ybFQqr3TZkqJw'; // UU prefix for uploads playlist
    
    // Parse category from request body or query params
    let category = '';
    try {
      const body = await req.json();
      category = body.category || '';
    } catch {
      const url = new URL(req.url);
      category = url.searchParams.get('category') || '';
    }
    
    console.log(`Fetching YouTube videos for @KnowRISKio, category: "${category}"`);
    
    // Use playlistItems API instead of search (1 quota unit vs 100!)
    const videosUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=12&key=${YOUTUBE_API_KEY}`;
    console.log('Fetching videos from uploads playlist');
    
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
    
    // Transform playlistItems format to match search format for compatibility
    const transformedVideos = (videosData.items || []).map((item: any) => ({
      id: {
        videoId: item.snippet.resourceId?.videoId || item.id
      },
      snippet: item.snippet
    }));
    
    // Filter by category if specified (client-side filtering since playlistItems doesn't support search)
    const filteredVideos = category 
      ? transformedVideos.filter((video: any) => {
          const title = video.snippet.title?.toLowerCase() || '';
          const description = video.snippet.description?.toLowerCase() || '';
          const searchTerm = category.toLowerCase();
          return title.includes(searchTerm) || description.includes(searchTerm);
        })
      : transformedVideos;
    
    return new Response(JSON.stringify({ videos: filteredVideos }), {
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

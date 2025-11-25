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

    const { category } = await req.json();
    
    // Usar o ID do canal diretamente
    const channelId = 'UCyaSDXX80pRWKrR3tnwyCNA';
    
    console.log('Fetching videos for channel:', channelId, 'with category:', category);
    
    // Buscar vídeos do canal
    const searchQuery = category ? `&q=${encodeURIComponent(category)}` : '';
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=12${searchQuery}&key=${YOUTUBE_API_KEY}`
    );
    
    if (!videosResponse.ok) {
      const errorText = await videosResponse.text();
      console.error('YouTube API error response:', {
        status: videosResponse.status,
        statusText: videosResponse.statusText,
        body: errorText
      });
      
      // Return empty array instead of throwing on quota exceeded
      if (videosResponse.status === 403 && errorText.includes('quotaExceeded')) {
        console.log('YouTube quota exceeded, returning empty result');
        return new Response(JSON.stringify({ videos: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`Failed to fetch videos: ${videosResponse.status} - ${errorText}`);
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

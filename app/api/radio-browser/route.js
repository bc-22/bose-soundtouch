export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return Response.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    // Use one of Radio-Browser's public servers
    const response = await fetch(
      `https://de1.api.radio-browser.info/json/stations/byname/${encodeURIComponent(query)}`,
      {
        headers: {
          'User-Agent': 'BoseSoundTouchApp/1.0',
        },
      }
    );
    
    if (!response.ok) {
      return Response.json({ error: 'Search failed' }, { status: response.status });
    }
    
    const data = await response.json();
    
    return Response.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Radio-Browser search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

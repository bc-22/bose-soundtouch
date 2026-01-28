export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    console.error('TuneIn: Missing query parameter');
    return Response.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    console.log('TuneIn search for:', query);
    
    // Try the OPML format first (more reliable)
    const url = `https://opml.radiotime.com/Search.ashx?query=${encodeURIComponent(query)}`;
    console.log('Fetching:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    
    console.log('TuneIn response status:', response.status);
    
    if (!response.ok) {
      console.error('TuneIn API error:', response.status, response.statusText);
      return Response.json({ 
        error: `TuneIn API returned ${response.status}`,
        body: [] 
      }, { status: 200 }); // Return 200 with empty results instead of failing
    }
    
    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);
    
    // Check if it's XML (OPML) or JSON
    if (contentType && contentType.includes('xml')) {
      // Parse OPML XML
      const text = await response.text();
      console.log('Got XML response');
      
      // For now, return empty results for XML
      // We'll parse it if needed
      return Response.json({
        head: { title: 'Search Results', status: '200' },
        body: []
      }, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } else {
      // Try JSON
      const data = await response.json();
      console.log('Got JSON response with', data.body?.length || 0, 'results');
      
      return Response.json(data, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }
  } catch (error) {
    console.error('TuneIn search error:', error);
    
    // Return empty results instead of error
    return Response.json({
      head: { title: 'Search Results', status: '200' },
      body: []
    }, {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

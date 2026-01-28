export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  
  if (!query) {
    return Response.json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://opml.radiotime.com/Search.ashx?query=${encodeURIComponent(query)}&render=json`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );
    
    const data = await response.json();
    
    return Response.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('TuneIn search error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

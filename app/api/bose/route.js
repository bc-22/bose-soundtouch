export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const ip = searchParams.get('ip');
  
  if (!endpoint || !ip) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const response = await fetch(`http://${ip}:8090${endpoint}`, {
      headers: {
        'Accept': '*/*',
      },
    });
    const text = await response.text();
    
    return new Response(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('GET Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const ip = searchParams.get('ip');
  
  if (!endpoint || !ip) {
    console.error('Missing parameters:', { endpoint, ip });
    return Response.json({ error: 'Missing endpoint or ip parameter' }, { status: 400 });
  }

  try {
    // Get the raw body - this is critical for XML
    let body = '';
    
    try {
      body = await request.text();
      console.log(`POST to ${endpoint}:`, body);
    } catch (e) {
      console.error('Failed to read body:', e);
      return Response.json({ error: 'Failed to read request body' }, { status: 400 });
    }
    
    if (!body) {
      console.error('Empty body received');
      return Response.json({ error: 'Request body is empty' }, { status: 400 });
    }
    
    const response = await fetch(`http://${ip}:8090${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'text/xml; charset=UTF-8',
      },
      body: body,
    });
    
    const text = await response.text();
    console.log(`Response from ${endpoint}:`, text);
    
    return new Response(text, {
      status: response.status,
      headers: {
        'Content-Type': 'text/xml',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('POST Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

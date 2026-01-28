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
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get('endpoint');
  const ip = searchParams.get('ip');
  const body = await request.text();
  
  if (!endpoint || !ip) {
    return Response.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const response = await fetch(`http://${ip}:8090${endpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'text/xml',
        'Accept': '*/*',
      },
      body: body,
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
    return Response.json({ error: error.message }, { status: 500 });
  }
}

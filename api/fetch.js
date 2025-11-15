export default async function handler(req, res) {
  // Support both GET and POST; allow URL param either way for flexibility
  const url =
    req.query.url ||
    (req.method === "POST" && req.body && req.body.url);

  if (!url) {
    res.status(400).send('Missing "url" query parameter');
    return;
  }

  // Parse custom headers (from JSON string in ?headers=)
  let headers = {};
  if (req.query.headers) {
    try {
      headers = JSON.parse(req.query.headers);
    } catch (e) {
      // Ignore parse error
    }
  }

  // Log request (will be visible in Vercel deploy logs)
  console.log(`[${new Date().toISOString()}] Proxying: ${url} | Headers: ${JSON.stringify(headers)}`);

  try {
    // Forward method/body if POST
    const fetchOptions = {
      method: req.method,
      headers,
    };
    if (req.method === "POST" && req.body && req.body.data) {
      fetchOptions.body = req.body.data;
    }

    const fetchRes = await fetch(url, fetchOptions);

    // Pass thru all content-types, default to text/html
    const contentType = fetchRes.headers.get('content-type') || 'text/html';
    res.setHeader('Content-Type', contentType);

    let body = await fetchRes.text();

    // Optional: HTML logging/script injection at end of body
    if (contentType.includes('text/html') && req.query.injectLog) {
      body = body.replace(
        '</body>',
        `<script>console.log('Slot game HTML loaded via proxy');</script></body>`
      );
    }

    // Optional: allow direct download if requested
    if (req.query.download === 'true') {
      res.setHeader('Content-Disposition', 'attachment; filename="proxied_game.html"');
    }

    res.status(fetchRes.status).send(body);
  } catch (error) {
    res.status(500).send('Server error fetching target: ' + error.toString());
  }
}

// Enable Vercel "bodyParser" for POST JSON/URL-encoded parsing
export const config = { api: { bodyParser: true } };

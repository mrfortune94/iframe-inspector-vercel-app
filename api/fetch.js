export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) {
    res.status(400).send('Missing "url" query parameter');
    return;
  }
  try {
    const fetchRes = await fetch(url);
    if (!fetchRes.ok) {
      res.status(fetchRes.status).send('Error fetching target URL');
      return;
    }
    const html = await fetchRes.text();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    res.status(500).send('Server error fetching URL');
  }
}

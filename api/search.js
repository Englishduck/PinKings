export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: `You are a golf course database. Return ONLY a valid JSON array of up to 5 matching courses, no markdown, no explanation. Each object must have: name, location, courseRating (number), slopeRating (number), par (number), lat (number), lng (number). Example: [{"name":"Pebble Beach Golf Links","location":"Pebble Beach, CA","courseRating":74.7,"slopeRating":144,"par":72,"lat":36.5681,"lng":-121.9486}]`,
        messages: [{ role: 'user', content: `Find golf course: "${query}". Return JSON array only.` }]
      })
    });
    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = text.replace(/```json|```/g, '').trim();
    let courses = [];
    try { courses = JSON.parse(clean); }
    catch(e) { const m = clean.match(/\[[\s\S]*\]/); if(m) courses = JSON.parse(m[0]); }
    return res.status(200).json({ courses });
  } catch(err) {
    return res.status(500).json({ error: 'Search failed', detail: err.message });
  }
}

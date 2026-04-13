module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Missing API key' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'No query' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: `You are a golf course database. Return ONLY a raw JSON array of up to 5 real matching golf courses. No markdown, no explanation, just the JSON array.
Each object must have: name (string), location (string), courseRating (number), slopeRating (number), par (number), lat (number), lng (number).
Example: [{"name":"Pebble Beach Golf Links","location":"Pebble Beach, CA, USA","courseRating":74.7,"slopeRating":144,"par":72,"lat":36.5681,"lng":-121.9486}]`,
        messages: [{
          role: 'user',
          content: `Find golf course: "${query}". Return JSON array only.`
        }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ 
        error: 'Anthropic error', 
        detail: data.error ? data.error.message : JSON.stringify(data) 
      });
    }

    const text = (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    let courses = [];
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      const match = clean.match(/\[[\s\S]*\]/);
      courses = match ? JSON.parse(match[0]) : JSON.parse(clean);
    } catch (e) {
      return res.status(500).json({ error: 'Parse failed', raw: text });
    }

    return res.status(200).json({ courses });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

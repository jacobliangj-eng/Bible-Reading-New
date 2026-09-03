export default async function handler(req: any, res: any) {
  try {
    let fragment = '';
    
    if (req.query) {
      if (Array.isArray(req.query.fragment)) {
        fragment = req.query.fragment.join('/');
      } else if (typeof req.query.fragment === 'string') {
        fragment = req.query.fragment;
      } else if (typeof req.query.q === 'string') {
        fragment = req.query.q;
      }
    }

    if (!fragment && req.url) {
      const urlWithoutQuery = req.url.split('?')[0];
      fragment = urlWithoutQuery.replace(/^\/api\/bibletool\/?/, '');
    }

    if (!fragment) {
      return res.status(400).json({ error: 'Missing fragment parameter' });
    }

    if (!fragment.includes(':')) {
      fragment = `UCV:${fragment}:1`;
    } else if (fragment.split(':').length === 2) {
      fragment = `UCV:${fragment}`;
    }

    const targetUrl = `https://bibletool.konline.org/retrieve/${fragment}`;
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://bibletool.konline.org/',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `BibleTool returned status ${response.status}` });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Internal proxy error' });
  }
}

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Enable CORS for all incoming client requests
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // In-memory cache for bibletool results to serve mobile devices instantly
  const bibleToolCache = new Map<string, any>();

  // Proxy endpoint for bibletool.konline.org to bypass CORS
  app.get(['/api/bibletool', '/api/bibletool/:fragment', '/api/bibletool/:version/:bookNumber/:chapter'], async (req, res) => {
    try {
      let fragment = (req.params.fragment || (req.query.q as string) || '').trim();
      if (!fragment && req.params.bookNumber && req.params.chapter) {
        const ver = req.params.version || 'UCV';
        fragment = `${ver}:${req.params.bookNumber}:${req.params.chapter}`;
      }
      if (!fragment) {
        return res.status(400).json({ error: 'Missing fragment parameter' });
      }

      // Check in-memory cache
      if (bibleToolCache.has(fragment)) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.json(bibleToolCache.get(fragment));
      }

      const targetUrl = `https://bibletool.konline.org/retrieve/${fragment}`;
      
      let response: Response | null = null;
      // Retry up to 2 attempts with timeout
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          response = await fetch(targetUrl, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json, text/plain, */*',
              'Referer': 'https://bibletool.konline.org/',
            },
          });
          clearTimeout(timeoutId);
          if (response.ok) break;
        } catch (fetchErr) {
          if (attempt === 2) throw fetchErr;
        }
      }

      if (!response || !response.ok) {
        return res.status(response?.status || 502).json({ error: `BibleTool returned status ${response?.status}` });
      }
      const rawText = await response.text();
      // Ensure all occurrences of 上帝 are normalized to 神 in CUV
      const normalizedText = rawText.replace(/上帝/g, '神');
      const data = JSON.parse(normalizedText);

      // Cache normalized data in memory
      bibleToolCache.set(fragment, data);

      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.json(data);
    } catch (err: any) {
      console.error('[BibleTool Proxy Error]:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch from BibleTool' });
    }
  });

  // API health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development vs static build in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

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

  // Proxy endpoint for bibletool.konline.org to bypass CORS
  app.get(['/api/bibletool', '/api/bibletool/:fragment', '/api/bibletool/:version/:bookNumber/:chapter'], async (req, res) => {
    try {
      let fragment = (req.params.fragment || (req.query.q as string) || '').trim();
      if (!fragment && req.params.bookNumber && req.params.chapter) {
        const ver = req.params.version || 'UCV';
        fragment = `${ver}:${req.params.bookNumber}:${req.params.chapter}`;
      }
      if (!fragment && req.query.book && req.query.chapter) {
        const ver = (req.query.version as string) || 'UCV';
        fragment = `${ver}:${req.query.book}:${req.query.chapter}`;
      }
      if (!fragment) {
        return res.status(400).json({ error: 'Missing fragment parameter' });
      }

      // Standardize fragment format (e.g., UCV:1:1)
      if (!fragment.includes(':')) {
        fragment = `UCV:${fragment}:1`;
      } else if (fragment.split(':').length === 2) {
        // e.g. 1:1 -> UCV:1:1
        fragment = `UCV:${fragment}`;
      }

      const targetUrl = `https://bibletool.konline.org/retrieve/${fragment}`;
      console.log(`[BibleTool Proxy] Immediately downloading from: ${targetUrl}`);
      
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
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache',
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
      const data = await response.json();
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-BibleTool-Source', targetUrl);
      res.setHeader('X-BibleTool-Browse-Url', `https://bibletool.konline.org/browse/#${fragment}`);
      res.setHeader('X-BibleTool-Downloaded-At', new Date().toISOString());
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

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for bibletool.konline.org to bypass CORS
  app.get('/api/bibletool/:fragment', async (req, res) => {
    try {
      const fragment = req.params.fragment;
      const targetUrl = `https://bibletool.konline.org/retrieve/${fragment}`;
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: `BibleTool returned status ${response.status}` });
      }
      const data = await response.json();
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

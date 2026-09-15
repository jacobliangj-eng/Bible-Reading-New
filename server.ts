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

  // Search API proxy for FHL Bible search (bypasses CORS and normalizes query)
  app.get('/api/bible/search', async (req, res) => {
    try {
      const rawQ = (req.query.q as string || '').trim();
      const versionParam = (req.query.version as string || 'CUV').toUpperCase();
      
      if (!rawQ) {
        return res.json({ status: 'success', record_count: 0, record: [] });
      }

      // Collapse multiple whitespace characters into single spaces for clean query matching
      const cleanQ = rawQ.replace(/\s+/g, ' ').trim();

      // Handle French LSG search via Bolls Life (FRLSG)
      if (versionParam === 'LSG') {
        const hasChinese = /[\u4e00-\u9fa5]/.test(cleanQ);

        // If user searched Chinese keywords while French Segond is active, French Bible has no Chinese characters
        if (hasChinese) {
          return res.json({ status: 'success', record_count: 0, record: [] });
        }

        // Direct French/Latin search on Bolls Life (e.g. "Dieu", "amour", "lumière", "corbeau", "Jésus", "paix")
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const bollsRes = await fetch(`https://bolls.life/search/FRLSG/?search=${encodeURIComponent(cleanQ)}`, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/plain, */*',
            },
          });
          clearTimeout(timeoutId);
          if (bollsRes.ok) {
            const list = await bollsRes.json();
            if (Array.isArray(list)) {
              const validItems = list.filter(
                (item: any) =>
                  item &&
                  typeof item.book === 'number' &&
                  typeof item.chapter === 'number' &&
                  typeof item.verse === 'number' &&
                  typeof item.text === 'string'
              );

              // Prioritize items containing Bolls's highlight tag <mark> if any, otherwise check text inclusion
              const markedItems = validItems.filter((i: any) => i.text.includes('<mark>'));
              const itemsToUse = markedItems.length > 0 ? markedItems : validItems;

              const records = itemsToUse.slice(0, 1000).map((item: any) => ({
                bid: item.book,
                chap: item.chapter,
                sec: item.verse,
                bible_text: (item.text || '').replace(/<[^>]*>/g, '').trim(),
              }));
              return res.json({
                status: 'success',
                record_count: records.length,
                record: records,
              });
            }
          }
        } catch (lsgErr) {
          console.warn('[Bible Search Proxy] Bolls LSG search failed:', lsgErr);
        }
        return res.json({ status: 'success', record_count: 0, record: [] });
      }

      // Map version to FHL version code
      let versionCode = 'unv';
      if (versionParam === 'WEB' || versionParam === 'KJV') {
        versionCode = 'web';
      }

      const targetUrl = `https://bible.fhl.net/json/se.php?q=${encodeURIComponent(cleanQ)}&orig=0&VERSION=${versionCode}`;
      console.log(`[Bible Search Proxy] Querying: ${cleanQ} (${versionCode})`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      
      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({ error: 'Search upstream error' });
      }

      let data = await response.json();

      // If records > 500, FHL returns { status: "Fail: record count > 500", record_count: 1524 }
      // We automatically fetch all pages in parallel chunks of 500 (e.g. 耶穌 1524 條, 大衛 985 條)
      if (data.status !== 'success' && data.record_count && data.record_count > 0) {
        const total = Math.min(data.record_count, 3000);
        const chunkPromises: Promise<any>[] = [];
        for (let offset = 0; offset < total; offset += 500) {
          const chunkUrl = `${targetUrl}&limit=500&offset=${offset}`;
          chunkPromises.push(
            fetch(chunkUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
              },
            })
              .then((r) => r.json())
              .catch(() => null)
          );
        }

        const chunkResults = await Promise.all(chunkPromises);
        const allRecords: any[] = [];
        for (const chunk of chunkResults) {
          if (chunk && Array.isArray(chunk.record)) {
            allRecords.push(...chunk.record);
          }
        }

        data.status = 'success';
        data.record = allRecords;
        data.record_count = allRecords.length;
      }

      // Fallback to Bolls Life WEB if FHL returned 0 results for English WEB
      if ((versionParam === 'WEB' || versionParam === 'KJV') && (!data || !Array.isArray(data.record) || data.record.length === 0)) {
        try {
          const bollsWebRes = await fetch(`https://bolls.life/search/WEB/?search=${encodeURIComponent(cleanQ)}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json, text/plain, */*',
            },
          });
          if (bollsWebRes.ok) {
            const list = await bollsWebRes.json();
            if (Array.isArray(list) && list.length > 0) {
              data = {
                status: 'success',
                record_count: list.length,
                record: list.slice(0, 1000).map((item: any) => ({
                  bid: item.book,
                  chap: item.chapter,
                  sec: item.verse,
                  bible_text: (item.text || '').replace(/<[^>]*>/g, '').trim(),
                })),
              };
            }
          }
        } catch (webErr) {
          console.warn('[Bible Search Proxy] Bolls WEB fallback failed:', webErr);
        }
      }

      // Normalize God terms in records: '上帝' -> '　神'
      if (Array.isArray(data.record)) {
        data.record = data.record.map((item: any) => ({
          ...item,
          bible_text: item.bible_text
            ? item.bible_text.replace(/上帝/g, '　神').replace(/[ \t]{1,2}神/g, '　神')
            : '',
        }));
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.json(data);
    } catch (err: any) {
      console.error('[Bible Search Proxy Error]:', err);
      res.status(500).json({ error: err.message || 'Search failed' });
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

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Ensure page always scrolls to top on reload/refresh, especially on mobile browsers
if (typeof window !== 'undefined') {
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  window.addEventListener('load', () => {
    window.scrollTo(0, 0);
  });
  window.addEventListener('pageshow', (event) => {
    // If restored from bfcache or standard reload, force top position
    window.scrollTo(0, 0);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

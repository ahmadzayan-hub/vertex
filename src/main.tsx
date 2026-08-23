import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './utils/i18n';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root container #root not found');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker in production only. In dev, Vite already owns
// the module graph and a stale worker would break HMR.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      console.warn('[sw] registration failed', err);
    });
  });
}

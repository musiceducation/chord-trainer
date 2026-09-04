import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import App from './App.jsx';
import { LanguageProvider } from './hooks/useI18n.jsx';
import { initNativeShell } from './native/initNativeShell.js';
import { applyShotConfig } from './lib/shotMode.js';
import './index.css';

applyShotConfig();
initNativeShell();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </StrictMode>,
);

// PWA offline support (web only — never register in the iOS binary)
if ('serviceWorker' in navigator && !Capacitor.isNativePlatform()) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

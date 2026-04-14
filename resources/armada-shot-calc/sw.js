// sw.js
// Minimal service worker — exists solely to satisfy Android Chrome's
// PWA install requirement. No caching; GitHub Pages handles delivery.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

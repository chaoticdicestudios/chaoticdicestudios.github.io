// sw.js
const VERSION = 'v1.0.1';

self.addEventListener('install', () => {
  console.log(`Service Worker ${VERSION} installing...`);
  self.skipWaiting();
});

self.addEventListener('activate', () => self.clients.claim());
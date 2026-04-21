const CACHE_NAME = 'armada-calc-v1.1.2';
const FONT_CACHE_NAME = 'google-fonts-cache';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './questions.js',
  './manifest.json',
  './icons/galleon.svg',
  './icons/galleon-192.png',
  './icons/galleon-512.png',
  './icons/galleon-pwa-icon.svg',
  './icons/galleon-pwa-icon-180.png',
  './icons/galleon-pwa-icon-512.png',
  '../../images/logo.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(precacheAssets());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(cleanupOldCaches());
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (isGoogleFontRequest(url)) {
    event.respondWith(handleFontRequest(event.request));
  } else {
    event.respondWith(handleLocalRequest(event.request));
  }
});

async function precacheAssets() {
  const cache = await caches.open(CACHE_NAME);
  return cache.addAll(ASSETS);
}

async function cleanupOldCaches() {
  const keys = await caches.keys();
  const deletePromises = keys
    .filter(key => key !== CACHE_NAME && key !== FONT_CACHE_NAME)
    .map(key => caches.delete(key));
  return Promise.all(deletePromises);
}

function isGoogleFontRequest(url) {
  return url.origin === 'https://fonts.googleapis.com' || 
         url.origin === 'https://fonts.gstatic.com';
}

async function handleFontRequest(request) {
  const cache = await caches.open(FONT_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    return null;
  }
}

async function handleLocalRequest(request) {

  const cache = await caches.open(CACHE_NAME);

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    const scopedCachedResponse = await cache.match(request);
    
    if (scopedCachedResponse) {
      return scopedCachedResponse;
    }
  }

  return new Response("Not found", { status: 404 });
}
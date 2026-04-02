const CACHE_NAME = 'oasis-pos-v2'
const STATIC_ASSETS = ['/', '/login', '/checkout', '/manifest.json']
const API_CACHE = 'oasis-api-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME && k !== API_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API requests: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    // Cache GET API responses for offline use
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request).then((response) => {
          const clone = response.clone()
          caches.open(API_CACHE).then((cache) => cache.put(request, clone))
          return response
        }).catch(() => caches.match(request))
      )
    }
    return
  }

  // Static assets: cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => {
        // Offline fallback for navigation
        if (request.mode === 'navigate') return caches.match('/')
        return new Response('Offline', { status: 503 })
      })
    })
  )
})

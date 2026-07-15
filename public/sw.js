const CACHE_NAME = 'oasis-pos-v3'
const STATIC_ASSETS = ['/', '/login', '/checkout', '/manifest.json']
const API_CACHE = 'oasis-api-v1'

async function invalidateApiCache() {
  await caches.delete(API_CACHE)
  const clients = await self.clients.matchAll()
  clients.forEach((client) => client.postMessage({ type: 'SETTINGS_CACHE_INVALIDATED' }))
}

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

self.addEventListener('message', (event) => {
  if (event.data?.type === 'INVALIDATE_SETTINGS_CACHE') {
    event.waitUntil(invalidateApiCache())
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // API requests: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(API_CACHE).then((cache) => cache.put(request, clone))
          }
          return response
        }).catch(() => caches.match(request))
      )
    }
    if (request.method !== 'GET') {
      event.respondWith(
        fetch(request).then(async (response) => {
          if (response.ok) await invalidateApiCache()
          return response
        })
      )
    }
    return
  }

  // Navigation requests (page loads/refreshes): always network first
  // Prevents stale cached HTML from causing stuck loading states
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      }).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  // Static assets (JS, CSS, images): cache first, network fallback
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => new Response('Offline', { status: 503 }))
    })
  )
})

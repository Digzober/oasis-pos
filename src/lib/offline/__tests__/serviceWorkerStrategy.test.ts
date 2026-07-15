import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync('public/sw.js', 'utf8')

describe('service worker API caching', () => {
  it('uses network first for API GET requests', () => {
    const apiBranch = source.slice(
      source.indexOf("if (url.pathname.startsWith('/api/'))"),
      source.indexOf('// Navigation requests'),
    )

    expect(apiBranch.indexOf('fetch(request)')).toBeLessThan(apiBranch.indexOf('caches.match(request)'))
  })

  it('clears the API cache and notifies clients after successful mutations', () => {
    expect(source).toContain("request.method !== 'GET'")
    expect(source).toContain('caches.delete(API_CACHE)')
    expect(source).toContain("type: 'SETTINGS_CACHE_INVALIDATED'")
  })

  it('accepts an explicit settings-cache invalidation message', () => {
    expect(source).toContain("self.addEventListener('message'")
    expect(source).toContain("type === 'INVALIDATE_SETTINGS_CACHE'")
  })
})

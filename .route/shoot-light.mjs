import { chromium } from 'playwright'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'; dotenv.config({ path: '.env.local' })
const OUT = process.argv[2]
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: emp } = await sb.from('employees').select('id, organization_id, role, first_name, last_name').eq('role','owner').limit(1).single()
const { data: loc } = await sb.from('locations').select('id, name').eq('organization_id', emp.organization_id).limit(1).single()
const token = await new SignJWT({ employeeId: emp.id, organizationId: emp.organization_id, locationId: loc.id, locationName: loc.name, role: emp.role, firstName: emp.first_name, lastName: emp.last_name, permissions: [] }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(new TextEncoder().encode(process.env.SESSION_SECRET))
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addCookies([
  { name: 'oasis-session', value: token, domain: 'localhost', path: '/' },
  { name: 'oasis-location-id', value: loc.id, domain: 'localhost', path: '/' },
  { name: 'oasis-location-name', value: loc.name, domain: 'localhost', path: '/' },
  { name: 'oasis-theme', value: 'oasis-light', domain: 'localhost', path: '/' },
])
for (const [name, path] of [['light-customers','/customers'],['appearance','/settings/appearance']]) {
  const page = await ctx.newPage()
  await page.addInitScript(() => { try { localStorage.setItem('oasis-theme','oasis-light') } catch {} })
  await page.goto('http://localhost:3000'+path, { waitUntil: 'networkidle', timeout: 30000 })
  await page.evaluate(() => document.documentElement.dataset.theme = 'oasis-light')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/shot-${name}.png` })
  console.log('ok', name)
  await page.close()
}
await browser.close()

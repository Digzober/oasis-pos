import { chromium } from 'playwright'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const OUT = process.argv[2] || 'C:/Users/KANE(D~1/AppData/Local/Temp/claude/C--Users-Kane-Don-t-delete-C-Github-Projects-OCC-POS/a918ae1b-161d-4fd8-a609-fdb0f2fbd142/scratchpad'
const BASE = 'http://localhost:3000'

// Mint a real session JWT (same secret + shape the app uses)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const { data: emp } = await sb.from('employees').select('id, organization_id, role, first_name, last_name').eq('role','owner').limit(1).single()
const { data: loc } = await sb.from('locations').select('id, name').eq('organization_id', emp.organization_id).limit(1).single()
const secret = new TextEncoder().encode(process.env.SESSION_SECRET)
const token = await new SignJWT({
  employeeId: emp.id, organizationId: emp.organization_id, locationId: loc.id,
  locationName: loc.name, role: emp.role, firstName: emp.first_name, lastName: emp.last_name,
  permissions: [],
}).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('2h').sign(secret)

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.addCookies([
  { name: 'oasis-session', value: token, domain: 'localhost', path: '/' },
  { name: 'oasis-location-id', value: loc.id, domain: 'localhost', path: '/' },
  { name: 'oasis-location-name', value: loc.name, domain: 'localhost', path: '/' },
])

const shots = [
  ['login', '/login', false],
  ['dashboard', '/dashboard', true],
  ['inventory', '/inventory', true],
  ['products', '/products', true],
  ['customers', '/customers', true],
  ['appearance', '/settings/appearance', true],
]
for (const [name, path, auth] of shots) {
  const page = await ctx.newPage()
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/shot-${name}.png`, fullPage: false })
    console.log(`ok: ${name} -> ${page.url()}`)
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`)
    try { await page.screenshot({ path: `${OUT}/shot-${name}.png` }) } catch {}
  }
  await page.close()
}
await browser.close()
console.log('done. session emp=%s loc=%s', emp.id, loc.name)

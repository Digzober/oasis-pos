# Production Setup Runbook

## 1. Apply Migrations to Production Supabase

The production Supabase project has ID: `lesfrjlccghndhmmvmuo`

Since migrations were applied directly via SQL during development, apply them to production using the Supabase MCP or dashboard SQL editor:

1. Run `create_sale_transaction` function (from `supabase/migrations/20260330170000_create_sale_transaction_function.sql`)
2. Run `void_transaction` and `create_return_transaction` functions (from `supabase/migrations/20260330180000_void_return_functions.sql`)
3. Run `reconciliation_reports` table creation (from `supabase/migrations/20260330190000_reconciliation_reports.sql`)

Verify: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'` should return 69+

## 2. Production Environment Variables (Vercel)

Set these in the Vercel dashboard under Production environment:

```
NEXT_PUBLIC_SUPABASE_URL=https://lesfrjlccghndhmmvmuo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[prod anon key]
SUPABASE_SERVICE_ROLE_KEY=[prod service role key]
SESSION_SECRET=[generate: openssl rand -hex 32]
BIOTRACK_V1_URL=https://server.biotrackthc.net/serverjson.asp
BIOTRACK_V3_URL=https://v3.api.trace.nm.biotrackthc.net/v1
BIOTRACK_TRACE2_URL=https://api.nm.trace.biotrackthc.net
BIOTRACK_USERNAME=[production username]
BIOTRACK_PASSWORD=[production password]
BIOTRACK_LICENSE_NUMBER=[real license number]
BIOTRACK_TRAINING_MODE=false
CRON_SECRET=[generate: openssl rand -hex 32]
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_APP_NAME=Oasis POS
```

## 3. Run Production Seed

```bash
NEXT_PUBLIC_SUPABASE_URL=https://lesfrjlccghndhmmvmuo.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=[key] \
npx tsx scripts/seed.ts
```

This creates: organization, 17 locations, 24 categories, 10 brands, 10 strains, permission definitions, permission groups, sample employees, tax rates.

For production, update the seed script or run additional inserts for:
- Real employee accounts (all staff, not just test accounts)
- Real BioTrack location IDs per location
- Verified tax rates per municipality

## 4. Custom Domain Setup

1. Go to Vercel project → Settings → Domains
2. Add domain: `pos.oasiscannabis.com`
3. Add DNS record at your domain registrar:
   - Type: CNAME
   - Name: pos
   - Value: cname.vercel-dns.com
4. SSL is automatic (Vercel provisions Let's Encrypt)
5. Verify: `curl -I https://pos.oasiscannabis.com` returns 200

## 5. Monitoring Setup

### Uptime Monitoring
- Use UptimeRobot, Better Uptime, or similar
- Monitor: `https://pos.oasiscannabis.com/api/health`
- Check interval: 1 minute
- Alert on: HTTP status != 200 or response time > 5s
- Alert channels: SMS to Kane, email to admin@oasisvape.com

### Error Tracking
- Vercel logs: available at vercel.com/dashboard → Deployments → Functions
- Consider adding Sentry for detailed error tracking (Phase 6)

### Performance
- Enable Vercel Analytics in project settings
- Monitor: page load time (target < 2s), API response (target < 500ms)

## 6. Post-Deployment Verification

```bash
# Health check
curl https://pos.oasiscannabis.com/api/health

# API connectivity
curl https://pos.oasiscannabis.com/api/auth/locations

# Login test (replace with real location ID)
curl -X POST https://pos.oasiscannabis.com/api/auth/pin-login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234","locationId":"[coors-location-id]"}'
```

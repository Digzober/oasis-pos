# Oasis POS Go-Live Checklist

## Pre-Deployment (1 week before)
- [ ] All features verified in staging
- [ ] All 301 unit tests passing
- [ ] All E2E tests passing (checkout, customer, orders)
- [ ] BioTrack sandbox testing complete (sales, voids, returns, inventory sync)
- [ ] Tax rates verified against current NM rates for each location
- [ ] Receipt templates reviewed and approved
- [ ] Employee PINs distributed to all 5+ staff per location
- [ ] Location settings configured per location (POS, inventory, compliance)
- [ ] 193+ discount rules entered via discount builder
- [ ] Loyalty program settings confirmed (accrual rate, redemption, tiers)
- [ ] All 24 product categories mapped with tax and regulatory classifications
- [ ] Purchase limits verified (2oz rec flower equivalent)

## Deployment Day

### 1. Code Promotion
- [ ] Merge develop → main: `git checkout main && git merge develop && git push`
- [ ] Verify Vercel production deployment succeeds (check dashboard)
- [ ] Verify build completes without errors

### 2. Database Setup
- [ ] Apply all migrations to production Supabase (lesfrjlccghndhmmvmuo)
- [ ] Verify all 69+ tables exist
- [ ] Run production seed script: organization, locations, categories, permissions, employees, tax rates
- [ ] Verify seed data: `SELECT COUNT(*) FROM locations` = 17, `SELECT COUNT(*) FROM permission_definitions` = 286+

### 3. Environment Verification
- [ ] Verify health check: `curl https://pos.oasiscannabis.com/api/health` returns 200
- [ ] Verify Supabase connection (database: true in health response)
- [ ] Verify BioTrack connection (biotrack: true in health response)
- [ ] Verify BIOTRACK_TRAINING_MODE=false in production env vars

### 4. Initial Data Load
- [ ] Run first BioTrack inventory sync (pulls current inventory for all locations)
- [ ] Verify inventory appears in backoffice inventory page
- [ ] Map BioTrack products to local products (first-time matching)
- [ ] Run reconciliation to verify inventory counts match

### 5. Cron Job Verification
- [ ] BioTrack retry queue: running every 5 minutes
- [ ] Inventory sync: running every 15 minutes
- [ ] Order expiration: running every 15 minutes
- [ ] Scheduled reports: running daily at 7 AM

## Location Rollout (per location)

### Hardware Setup
- [ ] iPad/tablet mounted at register position
- [ ] Cash drawer connected and tested
- [ ] Receipt printer connected (USB or network)
- [ ] Barcode scanner paired (Bluetooth or USB)
- [ ] Network connectivity verified (WiFi or ethernet)

### Software Setup
- [ ] Navigate to pos.oasiscannabis.com/login on terminal device
- [ ] Install PWA (Add to Home Screen)
- [ ] Verify PWA launches in standalone mode
- [ ] Select correct location in login dropdown
- [ ] Test PIN login with manager account

### First Transaction Test
- [ ] Open cash drawer with starting bank ($200)
- [ ] Search for a product → verify it appears
- [ ] Add to cart → verify price and tax
- [ ] Complete sale with cash tender
- [ ] Verify receipt prints correctly
- [ ] Verify BioTrack sync status (green dot in status bar)
- [ ] Verify inventory decremented
- [ ] Void test transaction
- [ ] Verify inventory restored
- [ ] Verify cash drawer balance correct after void
- [ ] Process a test return
- [ ] Close drawer → verify closing report matches

### Staff Training
- [ ] Budtenders trained on: PIN login, product search, barcode scan, cart, checkout, customer lookup
- [ ] Shift leads trained on: drawer open/close, void process, return process, order queue
- [ ] Managers trained on: backoffice access, reports, inventory adjustments, employee management
- [ ] All staff know: who to call for issues (Kane/IT contact)

### Go-Live
- [ ] Old system (Dutchie) set to read-only for reference
- [ ] New system set as primary POS
- [ ] First real customer transaction completed successfully

## Post-Launch (first 48 hours)
- [ ] Monitor BioTrack sync failure rate (target: < 5%)
- [ ] Monitor cash drawer variances at close (target: < $5)
- [ ] Run daily reconciliation at each location
- [ ] Check Vercel logs for 5xx errors (target: 0)
- [ ] Verify online ordering is working (place test order, fulfill at register)
- [ ] Collect budtender feedback (what's slow, what's confusing)
- [ ] Address any critical bugs immediately (hotfix → deploy)

## Post-Launch (first week)
- [ ] Full reconciliation at all locations — compare BioTrack vs local
- [ ] Review sales reports against Dutchie historical (compare daily totals)
- [ ] Verify tax collection accuracy (compare tax reports)
- [ ] Confirm loyalty point accrual matches expectations
- [ ] Review discount application (spot check 10 transactions)
- [ ] Verify all cron jobs ran successfully for 7 days
- [ ] Performance review: page load times, API response times
- [ ] Decommission Dutchie access (after 2 weeks stable)

## Contacts
- **Developer**: Kane Oueis (koueis@oasiscannabisnm.com)
- **Supabase Dashboard**: https://supabase.com/dashboard/project/lesfrjlccghndhmmvmuo
- **Vercel Dashboard**: https://vercel.com/koueis-1751s-projects/oasis-pos
- **GitHub Repo**: https://github.com/Digzober/oasis-pos

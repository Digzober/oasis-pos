# PROMPT: Week One Readiness — Report Exports + Reports Hub

## Context

Oasis POS is replacing Dutchie across 15 cannabis retail locations in New Mexico. Day-one terminal features (queue, drawer close, receipt reprint) and mapper constraint fixes are done. This prompt covers two backoffice gaps managers will hit in week one:

1. Four reports have no CSV export — managers can't send data to accounting
2. No reports hub page — managers have to know exact URLs instead of browsing a report index

Ecommerce storefront will be built separately as its own dedicated phase. Time clock is handled by KayaPush (external tool), not needed here.

Read `DATABASE-CONSTRAINTS.md`, `MEMORY.md`, and `CLAUDE.md` before starting.

---

## TASK 1: Add CSV Export to All Reports Missing It

### Problem
Only 3 of 7 reports have CSV export (Closing, COGS, Transactions). The remaining 4 need it: Inventory, Reconciliation, Sales Dashboard, and Schedules.

### 1a. Inventory Report Export

**File:** `src/app/(backoffice)/reports/inventory/page.tsx`

Add an "Export CSV" button that exports the current filtered view. Columns:
```
Product Name, SKU, Barcode, Category, Brand, Room, Quantity, Unit, Cost, Retail Value, Testing Status, Last Updated
```

Filename: `inventory-report-{locationName}-{date}.csv`

Follow the existing export pattern from closing/page.tsx: build CSV string in browser, create Blob, trigger download via anchor element.

### 1b. Reconciliation Report Export

**File:** `src/app/(backoffice)/reports/reconciliation/page.tsx`

Export columns:
```
Barcode, Product Name, Local Quantity, BioTrack Quantity, Variance, Status (matched/discrepancy/local_only/biotrack_only)
```

Filename: `reconciliation-{locationName}-{date}.csv`

### 1c. Sales Dashboard Export

**File:** `src/app/(backoffice)/reports/sales/page.tsx`

Export the summary KPI data plus the hourly breakdown. Two sections in one CSV:

Section 1 (summary):
```
Metric, Value
Total Sales, $X
Transaction Count, X
Average Sale, $X
Total Tax, $X
Total Discounts, $X
```

Section 2 (hourly breakdown):
```
Hour, Transactions, Revenue
8 AM, X, $X
9 AM, X, $X
...
```

Filename: `sales-dashboard-{date}.csv`

### 1d. Schedules Report Export

**File:** `src/app/(backoffice)/reports/schedules/page.tsx`

Export columns:
```
Report Name, Frequency, Recipients, Last Sent, Next Scheduled, Status
```

Filename: `scheduled-reports-{date}.csv`

### Pattern to Follow

All exports use the same pattern already established in the codebase:

```typescript
function exportCSV(data: Row[], columns: string[], filename: string) {
  const header = columns.join(',')
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col] ?? ''
      // Escape commas and quotes
      const str = String(val)
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
    }).join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
```

Place the "Export CSV" button in the top-right of each report page, next to any existing filter controls. Use the same button style as the existing export buttons in closing/cogs/transactions reports.

---

## TASK 2: Reports Hub Page

### Problem
No central reports index page exists. Managers have to know exact URLs (/reports/sales, /reports/closing, etc.) or rely on sidebar navigation. A hub page gives them a single place to see all available reports.

### File: `src/app/(backoffice)/reports/page.tsx`

Create a reports index page with cards for each report:

```typescript
const reports = [
  {
    title: 'Sales Dashboard',
    description: 'Revenue, transaction counts, hourly breakdown, payment methods, top products',
    href: '/reports/sales',
    icon: 'DollarSign', // lucide icon name
    category: 'Sales',
  },
  {
    title: 'Transaction Log',
    description: 'Full transaction history with filters by date, type, status, and employee',
    href: '/reports/transactions',
    icon: 'Receipt',
    category: 'Sales',
  },
  {
    title: 'Closing Report',
    description: 'Cash drawer reconciliation: opening amount, expected vs actual cash, variance',
    href: '/reports/closing',
    icon: 'Vault',
    category: 'Cash',
  },
  {
    title: 'COGS Report',
    description: 'Cost of goods sold, profit margins, and product profitability analysis',
    href: '/reports/cogs',
    icon: 'TrendingUp',
    category: 'Inventory',
  },
  {
    title: 'Inventory Report',
    description: 'Current stock levels, valuations, room assignments, and testing status',
    href: '/reports/inventory',
    icon: 'Package',
    category: 'Inventory',
  },
  {
    title: 'Reconciliation',
    description: 'Compare local inventory counts against BioTrack state records',
    href: '/reports/reconciliation',
    icon: 'GitCompare',
    category: 'Compliance',
  },
  {
    title: 'Scheduled Reports',
    description: 'Manage automated report delivery via email',
    href: '/reports/schedules',
    icon: 'Clock',
    category: 'Configuration',
  },
]
```

Layout:
- Page title: "Reports"
- Group cards by category (Sales, Cash, Inventory, Compliance, Configuration)
- Each card: icon, title, description, click navigates to the report
- Cards use the standard dark theme (bg-gray-800, gray-700 borders, gray-50 text)
- Category headers as section dividers

---

## Execution Order

Tasks 1 and 2 are independent. Run them in parallel.

## Verification

After both tasks:
- `npm run typecheck` — zero errors
- `npm run lint` — zero errors
- `npm run test` — all passing
- Verify: every report page has a working "Export CSV" button that downloads valid CSV
- Verify: /reports shows hub page with cards linking to all 7 reports

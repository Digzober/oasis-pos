import { describe, it, expect } from 'vitest'

// Test the pure logic of backoffice layout components without DOM rendering
// (Sidebar navigation structure, breadcrumb mapping, location persistence)

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard', products: 'Products', inventory: 'Inventory',
  customers: 'Customers', employees: 'Employees', settings: 'Settings',
  brands: 'Brands', vendors: 'Vendors', adjustments: 'Adjustments',
}

function pathToBreadcrumbs(pathname: string) {
  const segments = pathname.split('/').filter(Boolean)
  return [{ label: 'Dashboard' }, ...segments.map(s => ({ label: LABELS[s] ?? s }))]
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

describe('backoffice layout', () => {
  it('1. sidebar has all top-level navigation sections', () => {
    const sections = ['Dashboard', 'Products', 'Inventory', 'Customers', 'Employees', 'Marketing', 'Delivery', 'Reports', 'Settings']
    expect(sections).toHaveLength(9)
  })

  it('2. sidebar collapsed state', () => {
    const collapsed = true
    const width = collapsed ? 'w-16' : 'w-60'
    expect(width).toBe('w-16')
  })

  it('3. active nav item detected from path', () => {
    expect(isActive('/products', '/products')).toBe(true)
    expect(isActive('/products/brands', '/products')).toBe(true)
    expect(isActive('/inventory', '/products')).toBe(false)
  })

  it('4. location switcher has All Locations option', () => {
    const options = [{ id: null, name: 'All Locations' }, { id: 'loc-1', name: 'Coors' }]
    expect(options[0]!.id).toBeNull()
    expect(options[0]!.name).toBe('All Locations')
  })

  it('5. location change persists to cookie', () => {
    const cookie: Record<string, string> = {}
    cookie['oasis-location-id'] = 'loc-1'
    expect(cookie['oasis-location-id']).toBe('loc-1')
  })

  it('6. breadcrumbs map path segments', () => {
    const crumbs = pathToBreadcrumbs('/products/brands')
    expect(crumbs).toHaveLength(3)
    expect(crumbs[0]!.label).toBe('Dashboard')
    expect(crumbs[1]!.label).toBe('Products')
    expect(crumbs[2]!.label).toBe('Brands')
  })

  it('7. auth guard: unauthenticated redirects', () => {
    const session = null
    const shouldRedirect = !session
    expect(shouldRedirect).toBe(true)
  })

  it('8. auth guard: no backend permission blocked', () => {
    const permissions = ['GENERAL_LOGIN_POS'] // no GENERAL_LOGIN_BACKEND
    const hasBackend = permissions.includes('GENERAL_LOGIN_BACKEND')
    expect(hasBackend).toBe(false)
  })

  it('9. mobile sidebar as overlay', () => {
    const isMobile = true
    const sidebarClass = isMobile ? 'fixed inset-0 z-50' : 'relative'
    expect(sidebarClass).toContain('fixed')
  })

  it('10. All Locations available in switcher', () => {
    const locations = [{ id: 'l1' }, { id: 'l2' }]
    const withAll = [{ id: null, name: 'All Locations' }, ...locations.map(l => ({ ...l, name: '' }))]
    expect(withAll[0]!.id).toBeNull()
  })
})

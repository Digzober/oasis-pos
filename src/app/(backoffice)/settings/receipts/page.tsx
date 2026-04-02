'use client'
import { useState, useEffect, useRef } from 'react'
import { useSession } from '@/hooks/useSession'
import { useSelectedLocation } from '@/hooks/useSelectedLocation'

const RECEIPT_SETTINGS = [
  { key: 'show_location_name', label: 'Show location name', section: 'Header' },
  { key: 'show_location_address', label: 'Show location address', section: 'Header' },
  { key: 'show_location_phone', label: 'Show phone number', section: 'Header' },
  { key: 'show_license_number', label: 'Show license number', section: 'Header' },
  { key: 'show_employee_name', label: 'Show employee name', section: 'Body' },
  { key: 'show_customer_name', label: 'Show customer name', section: 'Body' },
  { key: 'show_sku', label: 'Show SKU per item', section: 'Body' },
  { key: 'show_thc_percentage', label: 'Show THC% per item', section: 'Body' },
  { key: 'show_tax_breakdown', label: 'Show tax breakdown', section: 'Body' },
  { key: 'show_discount_details', label: 'Show discount names', section: 'Body' },
  { key: 'show_loyalty_points', label: 'Show loyalty points earned', section: 'Footer' },
  { key: 'show_return_policy', label: 'Show return policy', section: 'Footer' },
  { key: 'show_biotrack_id', label: 'Show BioTrack transaction ID', section: 'Footer' },
]

export default function ReceiptsPage() {
  const { locationId } = useSelectedLocation()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [config, setConfig] = useState<Record<string, any>>({})
  const { session } = useSession()
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (!locationId) return
    fetch(`/api/locations/${locationId}/settings`).then(r => r.json()).then(d => setConfig(d.settings?.receipt ?? {}))
  }, [locationId])

  const toggle = (key: string) => {
    const next = { ...config, [key]: !config[key] }
    setConfig(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (!locationId) return
      fetch(`/api/locations/${locationId}/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receipt: next }) })
    }, 500)
  }

  const sections = ['Header', 'Body', 'Footer']

  return (
    <div className="grid grid-cols-2 gap-6">
      <div>
        <h1 className="text-xl font-bold text-gray-50 mb-6">Receipt Configuration</h1>
        {sections.map(section => (
          <div key={section} className="bg-gray-800 rounded-xl border border-gray-700 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-300 uppercase mb-3">{section}</h3>
            <div className="space-y-3">
              {RECEIPT_SETTINGS.filter(s => s.section === section).map(s => (
                <div key={s.key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{s.label}</span>
                  <button onClick={() => toggle(s.key)}
                    className={`w-10 h-6 rounded-full transition-colors ${config[s.key] ? 'bg-emerald-600' : 'bg-gray-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${config[s.key] ? 'translate-x-4' : ''}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Preview */}
      <div>
        <h2 className="text-sm font-semibold text-gray-300 uppercase mb-3">Preview</h2>
        <div className="bg-white text-black rounded-lg p-4 text-xs font-mono leading-relaxed max-w-[300px]">
          {config.show_location_name !== false && <p className="text-center font-bold">Oasis Cannabis Co - Coors</p>}
          {config.show_location_address && <p className="text-center">5201 Coors Blvd NW, Albuquerque NM</p>}
          {config.show_location_phone && <p className="text-center">505-555-0100</p>}
          {config.show_license_number && <p className="text-center text-[10px]">License: NMCCD-1004</p>}
          <p className="border-t border-dashed border-gray-400 my-2" />
          {config.show_employee_name && <p>Cashier: Kane O.</p>}
          {config.show_customer_name && <p>Customer: Walk-in</p>}
          <p className="border-t border-dashed border-gray-400 my-2" />
          <p>Blue Dream 3.5g x1 .......$30.00</p>
          {config.show_sku && <p className="text-[10px] text-gray-500 ml-2">SKU: PRD-00001</p>}
          {config.show_thc_percentage && <p className="text-[10px] text-gray-500 ml-2">THC: 22.5%</p>}
          <p className="border-t border-dashed border-gray-400 my-2" />
          <p>Subtotal: $30.00</p>
          {config.show_tax_breakdown && <><p>Excise Tax: $3.60</p><p>GRT: $2.38</p></>}
          <p className="font-bold">Total: $35.98</p>
          <p className="border-t border-dashed border-gray-400 my-2" />
          {config.show_loyalty_points && <p>Points Earned: 35</p>}
          {config.show_return_policy && <p className="text-[10px] mt-1">Returns within 14 days with receipt</p>}
          {config.show_biotrack_id && <p className="text-[10px]">BT: TX-001234</p>}
        </div>
      </div>
    </div>
  )
}

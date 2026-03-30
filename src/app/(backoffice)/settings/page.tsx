'use client'
import Link from 'next/link'

const SECTIONS = [
  { label: 'Locations', href: '/settings/locations', desc: 'Location details, hours, license numbers' },
  { label: 'Registers', href: '/settings/registers', desc: 'Register setup and print settings' },
  { label: 'Rooms', href: '/settings/rooms', desc: 'Rooms and subrooms per location' },
  { label: 'Tax Rates', href: '/settings/taxes', desc: 'Tax rates by location' },
  { label: 'Purchase Limits', href: '/settings/limits', desc: 'Flower equivalency and limits' },
  { label: 'Fees & Donations', href: '/settings/fees', desc: 'Transaction fees and donation prompts' },
  { label: 'Receipts', href: '/settings/receipts', desc: 'Receipt format and content' },
]

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-gray-50 mb-6">Settings</h1>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href} className="bg-gray-800 rounded-xl border border-gray-700 p-4 hover:border-emerald-500/50 transition-colors">
            <h3 className="text-gray-50 font-semibold mb-1">{s.label}</h3>
            <p className="text-xs text-gray-400">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = { draft: 'bg-gray-600', scheduled: 'bg-blue-600', sending: 'bg-purple-600', sent: 'bg-emerald-600', cancelled: 'bg-red-600' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<C[]>([])
  useEffect(() => { fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d.campaigns ?? [])) }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-50">Campaigns</h1>
        <div className="flex gap-2">
          <Link href="/marketing/templates" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Templates</Link>
          <Link href="/marketing/workflows" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Workflows</Link>
          <Link href="/marketing/events" className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600">Events</Link>
        </div>
      </div>
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-4 py-3">Sent</th><th className="text-left px-4 py-3">Date</th>
          </tr></thead>
          <tbody>{campaigns.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-gray-500">No campaigns yet</td></tr>
            : campaigns.map((c: C) => (
            <tr key={c.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
              <td className="px-4 py-2.5"><Link href={`/marketing/campaigns/${c.id}`} className="text-gray-50 hover:text-emerald-400">{c.name}</Link></td>
              <td className="px-4 py-2.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${STATUS_COLORS[c.status] ?? 'bg-gray-600'}`}>{c.status?.toUpperCase()}</span></td>
              <td className="px-4 py-2.5 text-right text-gray-300 tabular-nums">{c.sending_count ?? 0}</td>
              <td className="px-4 py-2.5 text-gray-400 text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const STATUS_COLORS: Record<string, string> = { draft: 'bg-raised', scheduled: 'bg-info', sending: 'bg-info', sent: 'bg-accent', cancelled: 'bg-danger' }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type C = any

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<C[]>([])
  useEffect(() => { fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d.campaigns ?? [])) }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-primary">Campaigns</h1>
        <div className="flex gap-2">
          <Link href="/marketing/templates" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Templates</Link>
          <Link href="/marketing/workflows" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Workflows</Link>
          <Link href="/marketing/events" className="text-sm px-3 py-1.5 bg-raised text-secondary rounded-lg hover:bg-raised">Events</Link>
        </div>
      </div>
      <div className="bg-surface rounded-xl border border-edge overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-edge text-secondary text-xs uppercase">
            <th className="text-left px-4 py-3">Name</th><th className="text-center px-4 py-3">Status</th><th className="text-right px-4 py-3">Sent</th><th className="text-left px-4 py-3">Date</th>
          </tr></thead>
          <tbody>{campaigns.length === 0 ? <tr><td colSpan={4} className="text-center py-8 text-muted">No campaigns yet</td></tr>
            : campaigns.map((c: C) => (
            <tr key={c.id} className="border-b border-edge/50 hover:bg-raised/30">
              <td className="px-4 py-2.5"><Link href={`/marketing/campaigns/${c.id}`} className="text-primary hover:text-accent">{c.name}</Link></td>
              <td className="px-4 py-2.5 text-center"><span className={`text-[10px] font-bold px-2 py-0.5 rounded text-primary ${STATUS_COLORS[c.status] ?? 'bg-raised'}`}>{c.status?.toUpperCase()}</span></td>
              <td className="px-4 py-2.5 text-right text-secondary tabular-nums">{c.sending_count ?? 0}</td>
              <td className="px-4 py-2.5 text-secondary text-xs">{c.created_at ? new Date(c.created_at).toLocaleDateString() : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  )
}

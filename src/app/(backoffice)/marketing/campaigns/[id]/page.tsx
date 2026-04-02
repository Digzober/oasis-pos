'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'

/* ── style constants ─────────────────────────────────────── */
const inputCls =
  'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'
const sectionCls = 'bg-gray-800 rounded-xl border border-gray-700 p-6'

/* ── badge helpers ───────────────────────────────────────── */
function statusBadge(s: string) {
  switch (s) {
    case 'draft':
      return { cls: 'bg-gray-700 text-gray-300', label: 'Draft' }
    case 'active':
      return { cls: 'bg-emerald-900/50 text-emerald-400', label: 'Active' }
    case 'sent':
      return { cls: 'bg-blue-900/50 text-blue-400', label: 'Sent' }
    case 'paused':
      return { cls: 'bg-amber-900/50 text-amber-400', label: 'Paused' }
    case 'archived':
      return { cls: 'bg-gray-700 text-gray-500', label: 'Archived' }
    default:
      return { cls: 'bg-gray-700 text-gray-300', label: s }
  }
}

function channelBadge(ch: string) {
  switch (ch) {
    case 'email':
      return { cls: 'bg-blue-900/50 text-blue-400', label: 'Email' }
    case 'sms':
      return { cls: 'bg-purple-900/50 text-purple-400', label: 'SMS' }
    default:
      return { cls: 'bg-gray-700 text-gray-300', label: ch }
  }
}

function recipientStatusBadge(s: string) {
  switch (s) {
    case 'delivered':
      return 'bg-emerald-900/50 text-emerald-400'
    case 'opened':
      return 'bg-blue-900/50 text-blue-400'
    case 'clicked':
      return 'bg-purple-900/50 text-purple-400'
    case 'bounced':
      return 'bg-amber-900/50 text-amber-400'
    case 'failed':
      return 'bg-red-900/50 text-red-400'
    case 'unsubscribed':
      return 'bg-gray-700 text-gray-400'
    case 'sent':
      return 'bg-gray-700 text-gray-300'
    default:
      return 'bg-gray-700 text-gray-300'
  }
}

/* ── types ───────────────────────────────────────────────── */
interface Campaign {
  id: string
  name: string
  status: string
  type: string
  channel: string
  subject: string
  preview_text: string
  sender_email: string
  send_to_segments: string[]
  template_name: string
  html_content: string
  created_at: string
  updated_at: string
}

interface Analytics {
  total_revenue: number
  recipients: number
  delivery_rate: number
  unsubscribes: number
  failed_deliveries: number
  open_rate: number
  funnel: {
    delivered: number
    opened: number
    clicked: number
    carts_created: number
    orders_placed: number
  }
}

interface Recipient {
  id: string
  name: string
  email: string
  status: string
  sent_at: string | null
  opened_at: string | null
  clicked_at: string | null
  revenue_attributed: number
}

/* ── page ────────────────────────────────────────────────── */
type Tab = 'overview' | 'content' | 'recipients'

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [tab, setTab] = useState<Tab>('overview')
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/campaigns/${id}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setCampaign(d.campaign ?? null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="text-gray-500 text-center py-20">Loading campaign...</div>
    )
  }
  if (!campaign) {
    return (
      <div className="text-gray-500 text-center py-20">Campaign not found</div>
    )
  }

  const sBadge = statusBadge(campaign.status)
  const cBadge = channelBadge(campaign.channel)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'content', label: 'Content' },
    { key: 'recipients', label: 'Recipients' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-gray-50">
      {/* header */}
      <div className="flex items-center gap-3 mb-1">
        <Link
          href="/marketing/campaigns"
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h1 className="text-xl font-bold">{campaign.name}</h1>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${sBadge.cls}`}
        >
          {sBadge.label}
        </span>
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${cBadge.cls}`}
        >
          {cBadge.label}
        </span>
      </div>

      {/* tabs */}
      <div className="flex gap-1 border-b border-gray-700 mb-6 mt-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* tab content */}
      {tab === 'overview' && <OverviewTab id={id} />}
      {tab === 'content' && (
        <ContentTab campaign={campaign} onUpdate={setCampaign} />
      )}
      {tab === 'recipients' && <RecipientsTab id={id} />}
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/*  Tab 1 — Overview (analytics)                             */
/* ────────────────────────────────────────────────────────── */
function OverviewTab({ id }: { id: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/campaigns/${id}/analytics`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setAnalytics(d.analytics ?? null))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return <div className="text-gray-500 text-center py-12">Loading analytics...</div>
  }

  if (!analytics) {
    return (
      <div className={sectionCls}>
        <p className="text-gray-500 text-center py-8">No analytics data yet</p>
      </div>
    )
  }

  const metrics = [
    {
      label: 'Total Revenue',
      value: `$${analytics.total_revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    },
    { label: 'Recipients', value: analytics.recipients.toLocaleString() },
    {
      label: 'Delivery Rate',
      value: `${analytics.delivery_rate.toFixed(1)}%`,
    },
    {
      label: 'Unsubscribes',
      value: analytics.unsubscribes.toLocaleString(),
    },
    {
      label: 'Failed Deliveries',
      value: analytics.failed_deliveries.toLocaleString(),
    },
    { label: 'Open Rate', value: `${analytics.open_rate.toFixed(1)}%` },
  ]

  const funnel = analytics.funnel
  const funnelBase = funnel.delivered || 1
  const funnelSteps = [
    { label: 'Delivered', count: funnel.delivered },
    { label: 'Opened', count: funnel.opened },
    { label: 'Clicked', count: funnel.clicked },
    { label: 'Carts Created', count: funnel.carts_created },
    { label: 'Orders Placed', count: funnel.orders_placed },
  ]

  return (
    <div className="space-y-6">
      {/* metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={sectionCls}>
            <p className="text-xs font-medium text-gray-400 uppercase mb-1">
              {m.label}
            </p>
            <p className="text-2xl font-bold text-gray-50">{m.value}</p>
          </div>
        ))}
      </div>

      {/* campaign funnel */}
      <div className={sectionCls}>
        <h3 className="text-sm font-semibold text-gray-300 uppercase mb-4">
          Campaign Funnel
        </h3>
        <div className="space-y-3">
          {funnelSteps.map((step, i) => {
            const pct = ((step.count / funnelBase) * 100).toFixed(1)
            const barWidth = `${Math.max(Number(pct), 2)}%`
            return (
              <div key={step.label}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-300">{step.label}</span>
                  <span className="text-gray-400 tabular-nums">
                    {step.count.toLocaleString()} ({pct}%)
                  </span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: barWidth,
                      backgroundColor:
                        i === 0
                          ? '#10b981'
                          : i === 1
                            ? '#3b82f6'
                            : i === 2
                              ? '#8b5cf6'
                              : i === 3
                                ? '#f59e0b'
                                : '#ec4899',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/*  Tab 2 — Content                                          */
/* ────────────────────────────────────────────────────────── */
function ContentTab({
  campaign,
  onUpdate,
}: {
  campaign: Campaign
  onUpdate: (c: Campaign) => void
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewWidth, setPreviewWidth] = useState<'desktop' | 'mobile'>(
    'desktop',
  )
  const [form, setForm] = useState({
    subject: campaign.subject ?? '',
    preview_text: campaign.preview_text ?? '',
    sender_email: campaign.sender_email ?? '',
    type: campaign.type ?? '',
  })

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
        cache: 'no-store',
      })
      if (res.ok) {
        const d = await res.json()
        onUpdate(d.campaign)
        setEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const fields: { key: keyof typeof form; label: string }[] = [
    { key: 'subject', label: 'Subject' },
    { key: 'preview_text', label: 'Preview Text' },
    { key: 'sender_email', label: 'Sender Email' },
    { key: 'type', label: 'Campaign Type' },
  ]

  return (
    <div className="space-y-6">
      {/* campaign settings */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">
            Campaign Settings
          </h3>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(false)}
                className="text-sm px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className={labelCls}>{f.label}</label>
              {editing ? (
                <input
                  className={inputCls}
                  value={form[f.key]}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                  }
                />
              ) : (
                <p className="text-sm text-gray-200 h-10 flex items-center">
                  {form[f.key] || '—'}
                </p>
              )}
            </div>
          ))}
          {/* read-only fields */}
          <div>
            <label className={labelCls}>Send To</label>
            <p className="text-sm text-gray-200 h-10 flex items-center">
              {campaign.send_to_segments?.length
                ? campaign.send_to_segments.join(', ')
                : '—'}
            </p>
          </div>
          <div>
            <label className={labelCls}>Template Name</label>
            <p className="text-sm text-gray-200 h-10 flex items-center">
              {campaign.template_name || '—'}
            </p>
          </div>
        </div>
      </div>

      {/* html content preview */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300 uppercase">
            Email Preview
          </h3>
          <div className="flex rounded-lg overflow-hidden border border-gray-600">
            <button
              onClick={() => setPreviewWidth('desktop')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                previewWidth === 'desktop'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Desktop
            </button>
            <button
              onClick={() => setPreviewWidth('mobile')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                previewWidth === 'mobile'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-gray-200'
              }`}
            >
              Mobile
            </button>
          </div>
        </div>
        {campaign.html_content ? (
          <div className="flex justify-center">
            <div
              className="bg-white rounded-lg overflow-hidden transition-all duration-300"
              style={{
                width: previewWidth === 'desktop' ? 640 : 375,
                minHeight: 400,
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: campaign.html_content }}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No email content to preview
          </p>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────── */
/*  Tab 3 — Recipients                                       */
/* ────────────────────────────────────────────────────────── */
const PAGE_SIZE = 25

function RecipientsTab({ id }: { id: string }) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/campaigns/${id}/recipients?page=${p}&limit=${PAGE_SIZE}`,
          { cache: 'no-store' },
        )
        const d = await res.json()
        setRecipients(d.recipients ?? [])
        setTotal(d.total ?? 0)
      } finally {
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    fetchPage(page)
  }, [page, fetchPage])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString() : '—'

  return (
    <div className={sectionCls}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Email</th>
              <th className="text-center px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Sent At</th>
              <th className="text-left px-4 py-3">Opened At</th>
              <th className="text-left px-4 py-3">Clicked At</th>
              <th className="text-right px-4 py-3">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : recipients.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-500">
                  No recipients found
                </td>
              </tr>
            ) : (
              recipients.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-4 py-2.5 text-gray-200">{r.name}</td>
                  <td className="px-4 py-2.5 text-gray-400">{r.email}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${recipientStatusBadge(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums">
                    {fmtDate(r.sent_at)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums">
                    {fmtDate(r.opened_at)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs tabular-nums">
                    {fmtDate(r.clicked_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-200 tabular-nums">
                    ${r.revenue_attributed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-400">
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-40 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 7) {
                pageNum = i + 1
              } else if (page <= 4) {
                pageNum = i + 1
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i
              } else {
                pageNum = page - 3 + i
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    page === pageNum
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

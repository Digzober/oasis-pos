'use client'

interface DateRangePickerProps {
  startDate: string | null
  endDate: string | null
  onChange: (start: string | null, end: string | null) => void
  presets?: Array<{ label: string; getRange: () => [string, string] }>
}

function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01` }
function lastMonthRange(): [string, string] { const d = new Date(); d.setMonth(d.getMonth() - 1); const s = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; d.setMonth(d.getMonth() + 1); d.setDate(0); return [s, d.toISOString().slice(0, 10)] }

const DEFAULT_PRESETS: DateRangePickerProps['presets'] = [
  { label: 'Today', getRange: () => [todayStr(), todayStr()] },
  { label: 'Yesterday', getRange: () => [daysAgo(1), daysAgo(1)] },
  { label: 'Last 7 Days', getRange: () => [daysAgo(7), todayStr()] },
  { label: 'Last 30 Days', getRange: () => [daysAgo(30), todayStr()] },
  { label: 'This Month', getRange: () => [monthStart(), todayStr()] },
  { label: 'Last Month', getRange: () => lastMonthRange() },
]

export function DateRangePicker({ startDate, endDate, onChange, presets = DEFAULT_PRESETS }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input type="date" value={startDate ?? ''} onChange={(e) => onChange(e.target.value, endDate)}
        className="h-9 rounded-sm border border-edge bg-surface px-3 text-[13px] text-primary focus:outline-none focus:ring-2 focus:ring-ring/25" />
      <span className="text-muted text-xs">to</span>
      <input type="date" value={endDate ?? ''} onChange={(e) => {
        const end = e.target.value
        if (startDate && end < startDate) onChange(end, startDate) // swap if end < start
        else onChange(startDate, end)
      }} className="h-9 rounded-sm border border-edge bg-surface px-3 text-[13px] text-primary focus:outline-none focus:ring-2 focus:ring-ring/25" />
      {(presets ?? []).map((p) => (
        <button key={p.label} onClick={() => { const [s, e] = p.getRange(); onChange(s, e) }}
          className="h-8 rounded-sm border border-edge bg-raised px-3 text-xs font-medium text-secondary transition-colors hover:bg-overlay">{p.label}</button>
      ))}
    </div>
  )
}

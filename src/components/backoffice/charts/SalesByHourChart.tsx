'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ hour: number; total: number; count: number }>
}

export default function SalesByHourChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.hour === 0 ? '12a' : d.hour < 12 ? `${d.hour}a` : d.hour === 12 ? '12p' : `${d.hour - 12}p`,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--edge)', borderRadius: 8 }}
            labelStyle={{ color: 'var(--text-primary)' }}
            itemStyle={{ color: 'var(--chart-1)' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Sales']}
          />
          <Bar dataKey="total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

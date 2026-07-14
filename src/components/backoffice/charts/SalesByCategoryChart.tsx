'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface Props {
  data: Array<{ category: string; total: number; count: number }>
}

export default function SalesByCategoryChart({ data }: Props) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--edge)" />
          <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
          <YAxis type="category" dataKey="category" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} width={120} />
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--surface-raised)', border: '1px solid var(--edge)', borderRadius: 8 }}
            labelStyle={{ color: 'var(--text-primary)' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Revenue']}
          />
          <Bar dataKey="total" fill="var(--chart-4)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

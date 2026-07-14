'use client'

import { useState, useEffect } from 'react'

interface ProfileData {
  id: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  email: string | null
  date_of_birth: string | null
  is_medical: boolean
  status: string
  lifetime_spend: number
  visit_count: number
  last_visit_at: string | null
  id_type: string | null
  has_id_on_file: boolean
  medical_card_number: string | null
  medical_card_expiration: string | null
  medical_card_expired: boolean
  is_first_visit: boolean
  loyalty_points: number
  loyalty_tier: string | null
  groups: Array<{ id: string; name: string }>
  recent_transactions: Array<{
    id: string
    created_at: string
    total: number
    status: string
    item_count: number
  }>
}

interface Props {
  customerId: string
  onClose: () => void
}

export default function CustomerProfileDrawer({ customerId, onClose }: Props) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${customerId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setProfile(data?.customer ?? null))
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [customerId])

  return (
    <>
      <div className="fixed inset-0 bg-bg/50 z-50" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-96 bg-surface border-l border-edge z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-edge flex items-center justify-between px-4 shrink-0">
          <h2 className="text-primary font-semibold">Customer Profile</h2>
          <button onClick={onClose} className="text-secondary hover:text-primary">✕</button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">Loading...</div>
        ) : !profile ? (
          <div className="flex-1 flex items-center justify-center text-muted text-sm">Customer not found</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Name + badges */}
            <div className="px-4 py-4 border-b border-edge">
              <div className="flex items-center gap-2">
                <h3 className="text-lg text-primary font-bold">
                  {profile.first_name} {profile.last_name}
                </h3>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  profile.is_medical ? 'bg-info text-primary' : 'bg-raised text-secondary'
                }`}>
                  {profile.is_medical ? 'MED' : 'REC'}
                </span>
              </div>
              {profile.is_first_visit && (
                <p className="text-accent text-xs mt-1 font-medium">First visit!</p>
              )}
            </div>

            {/* Contact */}
            <Section title="Contact">
              <Row label="Phone" value={profile.phone} />
              <Row label="Email" value={profile.email} />
              <Row label="DOB" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : null} />
            </Section>

            {/* ID Verification */}
            <Section title="ID Verification">
              {profile.has_id_on_file ? (
                <Row label="ID Type" value={profile.id_type?.replace('_', ' ')} />
              ) : (
                <p className="text-warning text-xs">No ID on file — verify ID</p>
              )}
            </Section>

            {/* Medical Card */}
            {profile.is_medical && (
              <Section title="Medical Card">
                <Row label="Card #" value={profile.medical_card_number} />
                <Row label="Expires" value={profile.medical_card_expiration ? new Date(profile.medical_card_expiration).toLocaleDateString() : null} />
                {profile.medical_card_expired && (
                  <p className="text-danger text-xs font-medium mt-1">Card expired — sale will process as recreational</p>
                )}
              </Section>
            )}

            {/* Loyalty */}
            <Section title="Loyalty">
              <Row label="Points" value={String(profile.loyalty_points)} />
              <Row label="Tier" value={profile.loyalty_tier ?? 'Standard'} />
              <Row label="Lifetime Spend" value={`$${profile.lifetime_spend.toFixed(2)}`} />
              <Row label="Total Visits" value={String(profile.visit_count)} />
            </Section>

            {/* Groups */}
            {profile.groups.length > 0 && (
              <Section title="Groups">
                <div className="flex flex-wrap gap-1">
                  {profile.groups.map((g) => (
                    <span key={g.id} className="text-xs bg-raised text-secondary px-2 py-0.5 rounded">
                      {g.name}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {/* Recent Transactions */}
            <Section title="Recent Purchases">
              {profile.recent_transactions.length === 0 ? (
                <p className="text-muted text-xs">No purchase history</p>
              ) : (
                <div className="space-y-2">
                  {profile.recent_transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-secondary">
                          {new Date(tx.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-muted ml-2">{tx.item_count} items</span>
                      </div>
                      <span className="text-primary tabular-nums">${tx.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-edge">
      <h4 className="text-xs text-secondary font-semibold uppercase tracking-wider mb-2">{title}</h4>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between text-sm py-0.5">
      <span className="text-secondary">{label}</span>
      <span className="text-primary">{value ?? '—'}</span>
    </div>
  )
}

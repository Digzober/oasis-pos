'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'

interface QuickCustomerFormProps {
  onClose: () => void
}

export default function QuickCustomerForm({ onClose }: QuickCustomerFormProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dob, setDob] = useState('')
  const [email, setEmail] = useState('')
  const [medCard, setMedCard] = useState('')
  const [medExpiration, setMedExpiration] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const setCustomer = useCart((s) => s.setCustomer)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim() || !dob) {
      setError('First name, last name, and date of birth are required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dob,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          medical_card_number: medCard.trim() || undefined,
          medical_card_expiration: medExpiration || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Failed to create customer')
        setIsSaving(false)
        return
      }

      const c = data.customer
      setCustomer(c.id, `${c.first_name} ${c.last_name}`, c.is_medical)
      onClose()
    } catch {
      setError('Connection error')
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-16">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-gray-50 font-semibold">New Customer</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200 text-lg">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="First Name *" value={firstName} onChange={setFirstName} />
            <Field label="Last Name *" value={lastName} onChange={setLastName} />
          </div>
          <Field label="Date of Birth *" value={dob} onChange={setDob} type="date" />
          <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
          <Field label="Email" value={email} onChange={setEmail} type="email" />

          <div className="pt-2 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2">Medical Card (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Card Number" value={medCard} onChange={setMedCard} />
              <Field label="Expiration" value={medExpiration} onChange={setMedExpiration} type="date" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full h-11 rounded-lg bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save & Attach to Sale'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-0.5 w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </label>
  )
}

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const inputCls = 'w-full h-10 px-3 bg-gray-900 border border-gray-600 rounded-lg text-sm text-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
const labelCls = 'block text-xs font-medium text-gray-400 uppercase mb-1'

type FieldVisibility = 'show' | 'hide' | 'required'

interface FieldConfig {
  field_key: string
  label: string
  visibility: FieldVisibility
  locked: boolean
}

interface FieldSection {
  key: string
  title: string
  fields: FieldConfig[]
}

const TABS = [
  { label: 'Doctors', href: '/customers/configure/doctors' },
  { label: 'Qualifying Conditions', href: '/customers/configure/qualifying-conditions' },
  { label: 'Fields', href: '/customers/configure/fields' },
  { label: 'Badge Priority', href: '/customers/configure/badge-priority' },
  { label: 'Badges', href: '/customers/configure/badges' },
]

function ConfigureTabs() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 border-b border-gray-700 mb-6">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`pb-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}

const POS_FIELDS: FieldConfig[] = [
  { field_key: 'status', label: 'Status', visibility: 'required', locked: true },
  { field_key: 'name', label: 'Name', visibility: 'show', locked: false },
  { field_key: 'dob', label: 'Date of Birth', visibility: 'show', locked: false },
  { field_key: 'customer_type', label: 'Customer Type', visibility: 'required', locked: true },
  { field_key: 'referred_by', label: 'Referred By', visibility: 'show', locked: false },
  { field_key: 'phone', label: 'Phone Number', visibility: 'show', locked: false },
  { field_key: 'mobile_phone', label: 'Mobile Phone', visibility: 'show', locked: false },
  { field_key: 'email', label: 'Email Address', visibility: 'show', locked: false },
  { field_key: 'drivers_license', label: 'License Number', visibility: 'show', locked: false },
  { field_key: 'drivers_license_exp', label: 'License Expiration', visibility: 'show', locked: false },
  { field_key: 'street', label: 'Street', visibility: 'show', locked: false },
  { field_key: 'city', label: 'City', visibility: 'show', locked: false },
  { field_key: 'zip', label: 'Postal Code', visibility: 'show', locked: false },
  { field_key: 'state', label: 'State', visibility: 'show', locked: false },
  { field_key: 'mmj_id', label: 'MMJ ID', visibility: 'show', locked: false },
  { field_key: 'mmj_id_exp', label: 'MMJ ID Expiration', visibility: 'show', locked: false },
  { field_key: 'prefix', label: 'Prefix', visibility: 'hide', locked: false },
  { field_key: 'middle_name', label: 'Middle Name', visibility: 'hide', locked: false },
  { field_key: 'suffix', label: 'Suffix', visibility: 'hide', locked: false },
  { field_key: 'nickname', label: 'Nickname', visibility: 'hide', locked: false },
  { field_key: 'gender', label: 'Gender', visibility: 'hide', locked: false },
  { field_key: 'last_name', label: 'Last Name', visibility: 'show', locked: false },
]

const BACKEND_FIELDS: FieldConfig[] = [
  { field_key: 'name', label: 'Name', visibility: 'show', locked: false },
  { field_key: 'type', label: 'Type', visibility: 'required', locked: true },
  { field_key: 'id_expiration', label: 'ID Expiration', visibility: 'show', locked: false },
  { field_key: 'address1', label: 'Address 1', visibility: 'show', locked: false },
  { field_key: 'address2', label: 'Address 2', visibility: 'hide', locked: false },
  { field_key: 'city', label: 'City', visibility: 'show', locked: false },
  { field_key: 'state', label: 'State', visibility: 'show', locked: false },
  { field_key: 'zip', label: 'Postal Code', visibility: 'show', locked: false },
  { field_key: 'status', label: 'Status', visibility: 'show', locked: false },
  { field_key: 'dob', label: 'DOB', visibility: 'show', locked: false },
  { field_key: 'drivers_license', label: 'Drivers License', visibility: 'show', locked: false },
  { field_key: 'drivers_license_exp', label: 'DL Expiration', visibility: 'show', locked: false },
  { field_key: 'phone', label: 'Phone', visibility: 'show', locked: false },
  { field_key: 'mobile_phone', label: 'Mobile Phone', visibility: 'show', locked: false },
  { field_key: 'email', label: 'Email', visibility: 'show', locked: false },
  { field_key: 'middle_name', label: 'Middle Name', visibility: 'hide', locked: false },
  { field_key: 'suffix', label: 'Suffix', visibility: 'hide', locked: false },
  { field_key: 'gender', label: 'Gender', visibility: 'hide', locked: false },
  { field_key: 'notes', label: 'Notes', visibility: 'show', locked: false },
  { field_key: 'caregiver_first', label: 'Caregiver First Name', visibility: 'hide', locked: false },
  { field_key: 'caregiver_last', label: 'Caregiver Last Name', visibility: 'hide', locked: false },
  { field_key: 'caregiver_phone', label: 'Caregiver Phone', visibility: 'hide', locked: false },
  { field_key: 'caregiver_email', label: 'Caregiver Email', visibility: 'hide', locked: false },
  { field_key: 'prefix', label: 'Prefix', visibility: 'hide', locked: false },
  { field_key: 'mmj_id', label: 'MMJ ID', visibility: 'show', locked: false },
  { field_key: 'last_name', label: 'Last Name', visibility: 'show', locked: false },
]

const PRESCRIPTION_FIELDS: FieldConfig[] = [
  { field_key: 'prescription_date', label: 'Prescription Date', visibility: 'required', locked: true },
  { field_key: 'prescription_exp', label: 'Prescription Expiration', visibility: 'required', locked: true },
  { field_key: 'rx_number', label: 'State RX Number', visibility: 'show', locked: false },
  { field_key: 'electronic', label: 'Electronic Prescription', visibility: 'show', locked: false },
  { field_key: 'product', label: 'Prescription Product', visibility: 'show', locked: false },
  { field_key: 'unit', label: 'Prescription Unit', visibility: 'show', locked: false },
  { field_key: 'quantity', label: 'Prescription Quantity', visibility: 'show', locked: false },
  { field_key: 'notes', label: 'Prescription Notes', visibility: 'show', locked: false },
]

const DEFAULT_SECTIONS: FieldSection[] = [
  { key: 'pos', title: 'Customer Profile (POS)', fields: POS_FIELDS },
  { key: 'backend', title: 'Customer Profile (Backend)', fields: BACKEND_FIELDS },
  { key: 'prescription', title: 'Customer Prescription', fields: PRESCRIPTION_FIELDS },
]

export default function FieldsPage() {
  const [sections, setSections] = useState<FieldSection[]>(DEFAULT_SECTIONS)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function fetchFields() {
      try {
        const res = await fetch('/api/customers/configure/fields', { cache: 'no-store' })
        if (res.ok) {
          const json = await res.json()
          if (json.sections) {
            setSections(json.sections)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    fetchFields()
  }, [])

  function toggleCollapse(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function updateField(sectionKey: string, fieldKey: string, visibility: FieldVisibility) {
    setSections((prev) =>
      prev.map((section) => {
        if (section.key !== sectionKey) return section
        return {
          ...section,
          fields: section.fields.map((f) =>
            f.field_key === fieldKey ? { ...f, visibility } : f
          ),
        }
      })
    )
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/customers/configure/fields', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
        cache: 'no-store',
      })
      if (res.ok) {
        setSaved(true)
      }
    } finally {
      setSaving(false)
    }
  }

  const selectCls = `${inputCls} appearance-none cursor-pointer`

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <h1 className="text-2xl font-bold text-gray-50 mb-6">Customer Configuration</h1>
      <ConfigureTabs />

      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading field configuration...</div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isCollapsed = collapsed[section.key]
            return (
              <div key={section.key} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleCollapse(section.key)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-50">{section.title}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {!isCollapsed && (
                  <div className="border-t border-gray-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Field</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase w-40">Visibility</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {section.fields.map((field) => (
                          <tr key={field.field_key} className="hover:bg-gray-750">
                            <td className="px-4 py-2.5 text-gray-200">{field.label}</td>
                            <td className="px-4 py-2.5">
                              {field.locked ? (
                                <span className="inline-flex items-center px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-400 cursor-not-allowed">
                                  Required
                                </span>
                              ) : (
                                <select
                                  value={field.visibility}
                                  onChange={(e) => updateField(section.key, field.field_key, e.target.value as FieldVisibility)}
                                  className={`${selectCls} h-8 text-xs w-32`}
                                >
                                  <option value="show">Show</option>
                                  <option value="hide">Hide</option>
                                  <option value="required">Required</option>
                                </select>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-400">Changes saved successfully.</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

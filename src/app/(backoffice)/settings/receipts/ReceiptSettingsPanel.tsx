'use client'

import { RECEIPT_SETTINGS, type ReceiptSetting } from './receiptSettings'

interface ReceiptSettingsPanelProps {
  config: Record<string, boolean>
  saving: boolean
  error: string
  onToggle: (setting: ReceiptSetting) => void
}

export function ReceiptSettingsPanel({ config, saving, error, onToggle }: ReceiptSettingsPanelProps) {
  return (
    <div>
      <h1 className="text-xl font-bold text-primary mb-6">Receipt Configuration</h1>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {['Header', 'Body', 'Footer'].map((section) => (
        <div key={section} className="bg-surface rounded-xl border border-edge p-4 mb-4">
          <h3 className="text-sm font-semibold text-secondary uppercase mb-3">{section}</h3>
          <div className="space-y-3">
            {RECEIPT_SETTINGS.filter((setting) => setting.section === section).map((setting) => (
              <div key={setting.key} className="flex items-center justify-between">
                <span className="text-sm text-secondary">{setting.label}</span>
                <button
                  onClick={() => onToggle(setting)}
                  disabled={saving}
                  className={`w-10 h-6 rounded-full transition-colors disabled:opacity-50 ${config[setting.key] ? 'bg-accent' : 'bg-raised'}`}
                >
                  <span className={`block w-4 h-4 bg-surface rounded-full mx-1 transition-transform ${config[setting.key] ? 'translate-x-4' : ''}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

'use client'

import { useSelectedLocation } from '@/hooks/useSelectedLocation'
import { ReceiptPreview } from './ReceiptPreview'
import { ReceiptSettingsPanel } from './ReceiptSettingsPanel'
import { useReceiptSettings } from './useReceiptSettings'

export default function ReceiptsPage() {
  const { locationId } = useSelectedLocation()
  const { config, savingKey, error, toggle } = useReceiptSettings(locationId)

  return (
    <div className="grid grid-cols-2 gap-6">
      <ReceiptSettingsPanel
        config={config}
        saving={savingKey !== null}
        error={error}
        onToggle={(setting) => void toggle(setting.key, setting.storage)}
      />
      <ReceiptPreview config={config} />
    </div>
  )
}

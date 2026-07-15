'use client'

import { useEffect, useState } from 'react'
import {
  DEFAULT_DISPLAY_CONFIG,
  type ReceiptSettingKey,
  type ReceiptSettingStorage,
} from './receiptSettings'

async function loadSettings(locationId: string, signal: AbortSignal) {
  const response = await fetch(`/api/settings/receipt-config?location_id=${locationId}`, {
    cache: 'no-store', signal,
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Receipt settings could not be loaded')
  return data.settings ?? DEFAULT_DISPLAY_CONFIG
}

async function saveSetting(
  locationId: string,
  key: ReceiptSettingKey,
  storage: ReceiptSettingStorage,
  value: boolean,
) {
  const response = await fetch('/api/settings/receipt-config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location_id: locationId, patch: { [storage]: { [key]: value } } }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'Receipt setting could not be saved')
  return data.settings as Record<string, boolean>
}

export function useReceiptSettings(locationId: string | null) {
  const [config, setConfig] = useState<Record<string, boolean>>(DEFAULT_DISPLAY_CONFIG)
  const [savingKey, setSavingKey] = useState<ReceiptSettingKey | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!locationId) return
    const controller = new AbortController()
    setError('')
    loadSettings(locationId, controller.signal)
      .then(setConfig)
      .catch((loadError) => {
        if (loadError instanceof DOMException && loadError.name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Receipt settings could not be loaded')
      })
    return () => controller.abort()
  }, [locationId])

  const toggle = async (key: ReceiptSettingKey, storage: ReceiptSettingStorage) => {
    if (!locationId) return
    const value = !config[key]
    setConfig((current) => ({ ...current, [key]: value }))
    setSavingKey(key)
    setError('')
    try {
      setConfig(await saveSetting(locationId, key, storage, value))
    } catch (saveError) {
      setConfig((current) => ({ ...current, [key]: !value }))
      setError(saveError instanceof Error ? saveError.message : 'Receipt setting could not be saved')
    } finally {
      setSavingKey(null)
    }
  }

  return { config, savingKey, error, toggle }
}

'use client'

import { useEffect, useState } from 'react'
import type { CustomerFieldVisibility } from '@/lib/customers/fieldVisibility'

export function useCustomerFieldVisibility(): CustomerFieldVisibility {
  const [visibility, setVisibility] = useState<CustomerFieldVisibility>({})

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/customers/configure/fields', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data: { fields?: CustomerFieldVisibility } | null) => {
        if (data?.fields) setVisibility(data.fields)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
      })

    return () => controller.abort()
  }, [])

  return visibility
}

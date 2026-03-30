'use client'

import { useEffect, useRef, useCallback } from 'react'
import { isBarcodeInput } from '@/lib/utils/barcodeDetector'

interface BarcodeScannerOptions {
  onScan: (barcode: string) => void
  enabled: boolean
}

export function useBarcodeScanner({ onScan, enabled }: BarcodeScannerOptions) {
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(null)
  const lastScanRef = useRef(0)

  const flush = useCallback(() => {
    const code = bufferRef.current
    bufferRef.current = ''
    if (!code) return

    // Debounce: ignore if same barcode scanned within 1s
    const now = Date.now()
    if (now - lastScanRef.current < 1000) return

    if (isBarcodeInput(code)) {
      lastScanRef.current = now
      onScan(code)
    }
  }, [onScan])

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea (search bar handles its own barcode logic)
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      const now = Date.now()

      if (e.key === 'Enter') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current)
        flush()
        return
      }

      // Only collect single printable characters
      if (e.key.length !== 1) return

      // If gap > 100ms, start fresh buffer (human typing, not scanner)
      if (now - lastKeyTimeRef.current > 100) {
        bufferRef.current = ''
      }

      lastKeyTimeRef.current = now
      bufferRef.current += e.key

      // Auto-flush after 500ms of inactivity
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        bufferRef.current = ''
      }, 500)
    }

    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [enabled, flush])
}

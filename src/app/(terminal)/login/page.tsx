'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface LocationOption {
  id: string
  name: string
  city: string
  state: string
}

export default function LoginPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    fetch('/api/auth/locations')
      .then((res) => res.json())
      .then((data) => {
        setLocations(data.locations ?? [])
        if (data.locations?.length > 0) {
          setSelectedLocation(data.locations[0].id)
        }
      })
      .catch(() => setError('Failed to load locations'))
  }, [])

  const submit = useCallback(
    async (fullPin: string) => {
      if (!selectedLocation) {
        setError('Select a location')
        return
      }
      setIsLoading(true)
      setError('')

      try {
        const res = await fetch('/api/auth/pin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: fullPin, locationId: selectedLocation }),
        })

        if (res.ok) {
          router.push('/checkout')
          return
        }

        const data = await res.json()
        setError(
          res.status === 403
            ? 'Not assigned to this location'
            : data.error ?? 'Invalid PIN',
        )
        setPin('')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      } catch {
        setError('Connection error')
        setPin('')
      } finally {
        setIsLoading(false)
      }
    },
    [selectedLocation, router],
  )

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLoading) return
      setError('')
      const next = pin + digit
      setPin(next)
      if (next.length === 4) {
        submit(next)
      }
    },
    [pin, isLoading, submit],
  )

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1))
    setError('')
  }, [])

  const handleClear = useCallback(() => {
    setPin('')
    setError('')
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Oasis Cannabis
          </h1>
          <p className="text-gray-400 mt-1 text-sm">Point of Sale</p>
        </div>

        {/* Location Selector */}
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full rounded-lg bg-gray-800 text-white border border-gray-700 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {locations.length === 0 && (
            <option value="">No locations available</option>
          )}
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name} — {loc.city}, {loc.state}
            </option>
          ))}
        </select>

        {/* PIN Dots */}
        <div className={`flex gap-4 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-colors ${
                i < pin.length
                  ? 'bg-emerald-400 border-emerald-400'
                  : 'border-gray-500'
              }`}
            />
          ))}
        </div>

        {/* Error Message */}
        <div className="h-6 flex items-center">
          {error && <p className="text-red-400 text-sm">{error}</p>}
          {isLoading && <p className="text-gray-400 text-sm">Verifying...</p>}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '⌫'].map(
            (key) => (
              <button
                key={key}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (key === '⌫') handleBackspace()
                  else if (key === 'CLR') handleClear()
                  else handleDigit(key)
                }}
                className={`h-16 rounded-xl text-xl font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${
                  key === 'CLR' || key === '⌫'
                    ? 'bg-gray-700 text-gray-300 active:bg-gray-600'
                    : 'bg-gray-800 text-white active:bg-gray-700'
                }`}
              >
                {key}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}

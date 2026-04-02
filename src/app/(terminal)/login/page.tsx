'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface LocationOption {
  id: string
  name: string
  city: string
  state: string
}

interface RegisterOption {
  id: string
  name: string
}

type LoginStep = 'pin' | 'register'

export default function LoginPage() {
  const router = useRouter()
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [shake, setShake] = useState(false)

  // Register selection state
  const [step, setStep] = useState<LoginStep>('pin')
  const [registers, setRegisters] = useState<RegisterOption[]>([])
  const [loadingRegisters, setLoadingRegisters] = useState(false)
  const [validatedPin, setValidatedPin] = useState('')

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

  const validatePin = useCallback(
    async (fullPin: string) => {
      if (!selectedLocation) {
        setError('Select a location')
        return
      }
      setIsLoading(true)
      setError('')

      try {
        // First validate PIN without register (will set session without register)
        const res = await fetch('/api/auth/pin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: fullPin, locationId: selectedLocation }),
        })

        if (res.ok) {
          setValidatedPin(fullPin)
          // Fetch registers for location
          setLoadingRegisters(true)
          const regRes = await fetch(`/api/registers?location_id=${selectedLocation}`)
          if (regRes.ok) {
            const regData = await regRes.json()
            const activeRegs = (regData.registers ?? []).filter((r: RegisterOption & { is_active?: boolean }) => r.is_active !== false)
            if (activeRegs.length === 0) {
              // No registers — go straight to checkout
              router.push('/checkout')
              return
            }
            setRegisters(activeRegs)
            setStep('register')
          } else {
            // Can't load registers — go to checkout anyway
            router.push('/checkout')
            return
          }
          setLoadingRegisters(false)
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

  const selectRegister = useCallback(
    async (registerId: string) => {
      setIsLoading(true)
      setError('')

      try {
        // Re-login with register included
        const res = await fetch('/api/auth/pin-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: validatedPin, locationId: selectedLocation, registerId }),
        })

        if (res.ok) {
          router.push('/checkout')
          return
        }

        const data = await res.json()
        setError(data.error ?? 'Failed to select register')
      } catch {
        setError('Connection error')
      } finally {
        setIsLoading(false)
      }
    },
    [validatedPin, selectedLocation, router],
  )

  const handleDigit = useCallback(
    (digit: string) => {
      if (isLoading) return
      setError('')
      const next = pin + digit
      setPin(next)
      if (next.length === 4) {
        validatePin(next)
      }
    },
    [pin, isLoading, validatePin],
  )

  const handleBackspace = useCallback(() => {
    setPin((p) => p.slice(0, -1))
    setError('')
  }, [])

  const handleClear = useCallback(() => {
    setPin('')
    setError('')
  }, [])

  const handleBackToPin = () => {
    setStep('pin')
    setPin('')
    setValidatedPin('')
    setRegisters([])
    setError('')
  }

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

        {step === 'pin' && (
          <>
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
          </>
        )}

        {step === 'register' && (
          <>
            <p className="text-gray-300 text-sm">Select your register</p>

            {loadingRegisters ? (
              <div className="text-gray-400 text-sm">Loading registers...</div>
            ) : registers.length === 0 ? (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">No registers available. Contact a manager.</p>
                <button onClick={handleBackToPin} className="text-sm text-emerald-400 hover:text-emerald-300">Back</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 w-full">
                {registers.map((reg) => (
                  <button
                    key={reg.id}
                    disabled={isLoading}
                    onClick={() => selectRegister(reg.id)}
                    className="h-20 rounded-xl bg-gray-800 border border-gray-700 text-white font-medium hover:border-emerald-500 hover:bg-gray-750 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {reg.name}
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button onClick={handleBackToPin} className="text-sm text-gray-400 hover:text-gray-300">
              Back to PIN
            </button>
          </>
        )}
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

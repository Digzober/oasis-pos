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
  has_open_drawer?: boolean
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

  // Track which dot just got filled for scale animation
  const [filledIndex, setFilledIndex] = useState<number | null>(null)

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
      setFilledIndex(next.length - 1)
      setTimeout(() => setFilledIndex(null), 200)
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
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <div className="w-full max-w-sm px-4">
        {step === 'pin' && (
          <>
            {/* Logo Mark */}
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-emerald-400 text-2xl font-bold">O</span>
            </div>

            {/* Title */}
            <h1 className="text-lg font-semibold text-gray-200 text-center">
              Oasis Cannabis
            </h1>
            <p className="text-xs text-gray-600 text-center mt-0.5 font-mono uppercase tracking-widest">
              Point of Sale
            </p>

            {/* Location Dropdown */}
            <div className="mt-8 w-full relative">
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full h-11 bg-gray-900 border border-gray-800 rounded-xl px-4 text-sm text-gray-300 focus:border-emerald-500/50 focus:outline-none appearance-none cursor-pointer"
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
              {/* Dropdown chevron */}
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* PIN Dots */}
            <div className={`flex justify-center gap-4 mt-10 ${shake ? 'animate-shake' : ''}`}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    i < pin.length
                      ? shake
                        ? 'bg-red-500 border border-red-400 shadow-md shadow-red-500/30'
                        : `bg-emerald-500 border border-emerald-400 shadow-md shadow-emerald-500/30 ${filledIndex === i ? 'scale-125' : ''}`
                      : 'bg-gray-800 border border-gray-700'
                  }`}
                />
              ))}
            </div>

            {/* Error / Loading Message */}
            <div className="h-6 mt-3">
              {error && (
                <p className="text-red-400 text-xs text-center">{error}</p>
              )}
              {isLoading && !error && (
                <p className="text-emerald-400 text-xs text-center animate-pulse">
                  Verifying...
                </p>
              )}
            </div>

            {/* Number Pad */}
            <div className="mt-8 grid grid-cols-3 gap-3 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLR', '0', '←'].map(
                (key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      if (key === '←') handleBackspace()
                      else if (key === 'CLR') handleClear()
                      else handleDigit(key)
                    }}
                    className={`h-14 rounded-xl transition-all focus:outline-none disabled:opacity-50 ${
                      key === 'CLR'
                        ? 'bg-gray-900 border border-gray-800 text-xs text-gray-500 hover:bg-gray-800 hover:border-gray-700 active:scale-95'
                        : key === '←'
                          ? 'bg-gray-900 border border-gray-800 text-gray-500 hover:bg-gray-800 hover:border-gray-700 active:scale-95 text-lg'
                          : 'bg-gray-900 border border-gray-800 text-xl font-medium text-gray-200 hover:bg-gray-800 hover:border-gray-700 active:scale-95'
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
            {/* Logo Mark */}
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <span className="text-emerald-400 text-2xl font-bold">O</span>
            </div>

            <h1 className="text-lg font-semibold text-gray-200 text-center">
              Oasis Cannabis
            </h1>
            <p className="text-sm text-gray-400 text-center mt-2">
              Select Register
            </p>

            {loadingRegisters ? (
              <div className="text-emerald-400 text-xs text-center mt-8 animate-pulse">
                Loading registers...
              </div>
            ) : registers.length === 0 ? (
              <div className="text-center mt-8">
                <p className="text-gray-500 text-sm">
                  No registers available. Contact a manager.
                </p>
                <button
                  onClick={handleBackToPin}
                  className="mt-4 text-sm text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Back
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 mt-6 max-w-sm mx-auto">
                {registers.map((reg) => (
                  <button
                    key={reg.id}
                    disabled={isLoading}
                    onClick={() => selectRegister(reg.id)}
                    className={`p-5 bg-gray-900 rounded-xl cursor-pointer hover:border-emerald-500/40 hover:bg-gray-800/60 active:scale-[0.97] transition-all text-center disabled:opacity-50 border ${
                      reg.has_open_drawer
                        ? 'border-emerald-500/20'
                        : 'border-gray-800'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-200 block">
                      {reg.name}
                    </span>
                    <span
                      className={`text-[11px] mt-1 block ${
                        reg.has_open_drawer
                          ? 'text-emerald-400'
                          : 'text-gray-600'
                      }`}
                    >
                      {reg.has_open_drawer ? 'Drawer Open' : 'No Drawer'}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <p className="text-red-400 text-xs text-center mt-4">{error}</p>
            )}

            {/* Back button */}
            {registers.length > 0 && (
              <p
                onClick={handleBackToPin}
                className="mt-6 text-sm text-gray-600 hover:text-gray-400 text-center cursor-pointer transition-colors"
              >
                Back to PIN
              </p>
            )}
          </>
        )}
      </div>

      {/* Animations */}
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

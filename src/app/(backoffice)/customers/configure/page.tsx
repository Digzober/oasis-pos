'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ConfigureRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/customers/configure/doctors') }, [router])
  return null
}

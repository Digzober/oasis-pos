import { requireSession, type SessionPayload } from './session'
import { AppError } from '@/lib/utils/errors'

const DUTCHIE_ROLES: ReadonlySet<SessionPayload['role']> = new Set([
  'manager',
  'admin',
  'owner',
])

export async function requireDutchieManager(): Promise<SessionPayload> {
  const session = await requireSession()
  if (!DUTCHIE_ROLES.has(session.role)) {
    throw new AppError('FORBIDDEN', 'Manager access required', undefined, 403)
  }
  return session
}

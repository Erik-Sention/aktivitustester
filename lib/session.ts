import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { SessionUser } from '@/types'

const SESSION_COOKIE = 'session'

function secret() {
  const s = process.env.SESSION_SECRET
  if (!s) throw new Error('SESSION_SECRET environment variable is not set')
  return s
}

function verifyToken(token: string): Record<string, unknown> | null {
  try {
    const { data, sig } = JSON.parse(Buffer.from(token, 'base64url').toString())
    const expected = createHmac('sha256', secret()).update(data).digest('hex')
    if (expected !== sig) return null
    const payload = JSON.parse(data)
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

async function getSessionPayload(): Promise<Record<string, unknown> | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const payload = await getSessionPayload()
  if (!payload) return null
  return {
    uid: payload.uid as string,
    email: payload.email as string,
    role: (payload.role as 'ADMIN' | 'TRAINER') ?? 'TRAINER',
    clinicId: (payload.clinicId as string) ?? '',
  }
}

export async function getSessionRefreshToken(): Promise<string | null> {
  const payload = await getSessionPayload()
  if (!payload) return null
  return (payload.refreshToken as string) || null
}

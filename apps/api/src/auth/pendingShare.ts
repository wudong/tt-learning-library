import { SignJWT, jwtVerify } from 'jose'
import type { ShareTargetPayload } from '@ttll/shared'

export const PENDING_SHARE_COOKIE = '__Host-ttll-pending-share'

function secret(): Uint8Array {
  const value = process.env.AUTH_COOKIE_SECRET
  if (!value || value.length < 32) throw new Error('AUTH_COOKIE_SECRET must be at least 32 characters')
  return new TextEncoder().encode(value)
}

export async function signPendingShare(payload: ShareTargetPayload): Promise<string> {
  return new SignJWT({ payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .setAudience('ttll-pending-share')
    .sign(secret())
}

export async function verifyPendingShare(token: string): Promise<ShareTargetPayload | null> {
  try {
    const result = await jwtVerify(token, secret(), { audience: 'ttll-pending-share' })
    const payload = result.payload.payload
    if (!payload || typeof payload !== 'object') return null
    return payload as ShareTargetPayload
  } catch {
    return null
  }
}

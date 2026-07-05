import type { ShareTargetPayload } from '@ttll/shared'

const TRACKING_PARAMS = ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','fbclid','gclid','igshid']
const URL_RE = /https?:\/\/[^\s<>()"']+/gi

export interface UrlIdentity { sourceUrl: string; canonicalUrl: string; sourcePlatform: 'youtube'|'facebook'|'other'; externalId: string | null }

type CaptureInput = ShareTargetPayload | { sourceUrl?: string; sharedText?: string }

function isShareTarget(payload: CaptureInput): payload is ShareTargetPayload {
  return 'url' in payload || 'text' in payload
}

export function extractLikelyUrl(payload: CaptureInput): string | null {
  const explicit = isShareTarget(payload) ? payload.url : payload.sourceUrl
  const text = isShareTarget(payload) ? payload.text : payload.sharedText
  for (const candidate of [explicit, text]) {
    if (!candidate) continue
    if (isHttpUrl(candidate.trim())) return candidate.trim()
    const match = candidate.match(URL_RE)?.[0]
    if (match && isHttpUrl(match)) return match
  }
  const combined = Object.values(payload).filter(Boolean).join(' ')
  const match = combined.match(URL_RE)?.[0]
  return match && isHttpUrl(match) ? match : null
}

export function isHttpUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === 'http:' || u.protocol === 'https:' } catch { return false }
}

export function detectProvider(hostname: string): 'youtube'|'facebook'|'other' {
  const h = hostname.toLowerCase().replace(/^www\./, '')
  if (h === 'youtube.com' || h.endsWith('.youtube.com') || h === 'youtu.be') return 'youtube'
  if (h === 'facebook.com' || h.endsWith('.facebook.com') || h === 'fb.watch') return 'facebook'
  return 'other'
}

export function canonicalizeUrl(sourceUrl: string): UrlIdentity {
  const url = new URL(sourceUrl)
  const platform = detectProvider(url.hostname)
  for (const key of TRACKING_PARAMS) url.searchParams.delete(key)
  url.hash = ''
  url.hostname = url.hostname.toLowerCase()

  let externalId: string | null = null
  if (platform === 'youtube') {
    if (url.hostname.toLowerCase().endsWith('youtu.be')) externalId = url.pathname.split('/').filter(Boolean)[0] ?? null
    else externalId = url.searchParams.get('v')
    if (externalId) {
      const canonical = new URL('https://www.youtube.com/watch')
      canonical.searchParams.set('v', externalId)
      return { sourceUrl, canonicalUrl: canonical.toString(), sourcePlatform: platform, externalId }
    }
  }
  return { sourceUrl, canonicalUrl: url.toString(), sourcePlatform: platform, externalId }
}

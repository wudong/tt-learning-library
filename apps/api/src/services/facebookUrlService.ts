const MAX_REDIRECTS = 4
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

type Fetcher = typeof fetch

export interface FacebookUrlResolver {
  resolve(sourceUrl: string): Promise<string>
}

function isAllowedFacebookUrl(url: URL): boolean {
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  return host === 'facebook.com' || host.endsWith('.facebook.com') || host === 'fb.watch'
}

function shouldResolve(url: URL): boolean {
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  return host === 'fb.watch'
    || host === 'l.facebook.com'
    || host === 'lm.facebook.com'
    || /^\/share\/(?:v|r|p)\//i.test(url.pathname)
}

function unwrapFacebookRedirect(url: URL): URL | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '')
  if (host !== 'l.facebook.com' && host !== 'lm.facebook.com') return null
  const target = url.searchParams.get('u')
  if (!target) return null
  try {
    const unwrapped = new URL(target)
    return isAllowedFacebookUrl(unwrapped) ? unwrapped : null
  } catch {
    return null
  }
}

export class FacebookUrlService implements FacebookUrlResolver {
  constructor(
    private readonly fetcher: Fetcher = fetch,
    private readonly timeoutMs = 2500,
    private readonly maxRedirects = MAX_REDIRECTS,
  ) {}

  async resolve(sourceUrl: string): Promise<string> {
    let current: URL
    try {
      current = new URL(sourceUrl)
    } catch {
      return sourceUrl
    }
    if (!isAllowedFacebookUrl(current)) return sourceUrl

    const unwrapped = unwrapFacebookRedirect(current)
    if (unwrapped) current = unwrapped
    if (!shouldResolve(current)) return current.toString()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      for (let redirectCount = 0; redirectCount < this.maxRedirects; redirectCount += 1) {
        const response = await this.fetcher(current, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': 'tt-learning-library/1.0 (+public Facebook URL resolver)',
          },
          signal: controller.signal,
        })
        await response.body?.cancel().catch(() => undefined)
        if (!REDIRECT_STATUSES.has(response.status)) return current.toString()

        const location = response.headers.get('location')
        if (!location) return current.toString()
        const next = new URL(location, current)
        if (!isAllowedFacebookUrl(next)) return current.toString()
        current = unwrapFacebookRedirect(next) ?? next
        if (!shouldResolve(current)) return current.toString()
      }
      return current.toString()
    } catch {
      return sourceUrl
    } finally {
      clearTimeout(timeout)
    }
  }
}

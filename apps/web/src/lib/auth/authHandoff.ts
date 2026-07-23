export interface AuthHandoffTokens {
  accessToken: string
  refreshToken: string
}

export function parseAuthHandoffUrl(input: string, expectedOrigin: string): AuthHandoffTokens {
  let parsed: URL
  try {
    parsed = new URL(input.trim())
  } catch {
    throw new Error('Paste the complete TT Learn sign-in link.')
  }
  if (parsed.origin !== expectedOrigin) throw new Error('This sign-in link is not for TT Learn.')

  const auth = new URLSearchParams(parsed.hash.slice(1))
  const accessToken = auth.get('access_token')
  const refreshToken = auth.get('refresh_token')
  if (!accessToken || !refreshToken) throw new Error('This sign-in link is incomplete or expired.')
  return { accessToken, refreshToken }
}

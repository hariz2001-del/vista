/**
 * The hub's whole conversation with api-vista: register, sign in, and mint a
 * one-time code to open the POS or RMS already signed in.
 *
 * The hub session is held in memory only. It can do nothing but mint codes,
 * lasts half an hour, and is gone when the tab closes — the POS and RMS keep
 * their own sessions on their own domains.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000').replace(
  /\/$/,
  '',
)

/** Where each app lives. Local development defaults to the Vite dev ports. */
export const APP_URLS = {
  POS: (import.meta.env.VITE_POS_URL ?? 'https://pos.vistahub.my').replace(/\/$/, ''),
  RMS: (import.meta.env.VITE_RMS_URL ?? 'https://rms.vistahub.my').replace(/\/$/, ''),
} as const

export type AppTarget = keyof typeof APP_URLS

export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const TIMEOUT_MS = 20_000

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch {
    throw new ApiError(
      'network',
      'Cannot reach Vista right now. Check the connection and try again.',
    )
  } finally {
    window.clearTimeout(timer)
  }

  const payload = (await response.json().catch(() => null)) as
    | (T & { error?: string; message?: string })
    | null

  if (!response.ok) {
    throw new ApiError(
      payload?.error ?? 'server:UNEXPECTED',
      payload?.message ?? 'Something went wrong. Try again.',
    )
  }
  return payload as T
}

export type HubSession = {
  token: string
  user: { name: string; email: string }
}

export type Registration = {
  businessName: string
  email: string
  password: string
  pin: string
}

export function register(input: Registration): Promise<HubSession> {
  return post<HubSession>('/auth/register', input)
}

export function signIn(email: string, password: string): Promise<HubSession> {
  return post<HubSession>('/auth/login', { email, password, scope: 'HUB' })
}

/**
 * Where to send the owner to open an app: its address with a one-time code in
 * the fragment. A fragment never reaches any server, so the code stays out of
 * access logs; the app reads it, swaps it for its own session and removes it.
 */
export async function handoffUrl(session: HubSession, target: AppTarget): Promise<string> {
  const { code } = await post<{ code: string }>('/auth/handoff', { target }, session.token)
  return `${APP_URLS[target]}/#handoff=${encodeURIComponent(code)}`
}

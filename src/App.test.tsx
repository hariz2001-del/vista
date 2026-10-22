import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

type Call = { url: string; body: unknown; auth: string | null }

let calls: Call[]
let assign: ReturnType<typeof vi.fn>

function respond(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const headers = (init.headers ?? {}) as Record<string, string>
      calls.push({ url, body: JSON.parse(String(init.body)), auth: headers.Authorization ?? null })
      if (url.endsWith('/auth/login')) {
        return respond(401, { error: 'auth:INVALID_CREDENTIALS', message: 'Incorrect email or password.' })
      }
      if (url.endsWith('/auth/handoff')) return respond(200, { code: 'one-time-code' })
      return respond(404, {})
    }),
  )
  assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, assign })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

describe('vistahub.my', () => {
  it('has no sign-up: a business gets in touch on WhatsApp instead', () => {
    render(<App />)
    expect(screen.queryByRole('button', { name: /create my business/i })).toBeNull()
    expect(screen.queryByLabelText('Business name')).toBeNull()
    const contact = screen.getByRole('link', { name: /contact me on whatsapp/i })
    expect(contact.getAttribute('href')).toMatch(/^https:\/\/wa\.me\//)
    expect(contact).toHaveAttribute('target', '_blank')
  })

  it('signs an existing business in, then opens the counter with a one-time code', async () => {
    vi.mocked(fetch).mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)), auth: headers.Authorization ?? null })
      if (String(url).endsWith('/auth/login')) return respond(200, { token: 'hub-token', user: { name: 'Kedai Baru', email: 'a@b.my' } })
      if (String(url).endsWith('/auth/handoff')) return respond(200, { code: 'one-time-code' })
      return respond(404, {})
    })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    type('Email', 'a@b.my')
    type('Password', 'long enough password')
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1) as HTMLElement)
    await screen.findByText('Kedai Baru')

    fireEvent.click(screen.getByRole('button', { name: /open the counter/i }))
    await waitFor(() => expect(assign).toHaveBeenCalled())
    const handoff = calls.find((call) => call.url.endsWith('/auth/handoff'))
    expect(handoff).toMatchObject({ body: { target: 'POS' }, auth: 'Bearer hub-token' })
    // In the fragment, which the browser never sends to the POS's server.
    expect(assign).toHaveBeenCalledWith('https://pos.vistahub.my/#handoff=one-time-code')
  })

  it('offers both demos, each opening in a new tab', () => {
    render(<App />)
    const counter = screen.getByRole('link', { name: /try the counter/i })
    const books = screen.getByRole('link', { name: /try the books/i })
    expect(counter).toHaveAttribute('href', 'https://demopos.vistahub.my')
    expect(books).toHaveAttribute('href', 'https://demorms.vistahub.my')
    for (const link of [counter, books]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('shows the server’s reason when sign-in fails', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    type('Email', 'a@b.my')
    type('Password', 'wrong')
    fireEvent.click(screen.getAllByRole('button', { name: 'Sign in' }).at(-1) as HTMLElement)

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.')
    expect(calls[0]?.body).toMatchObject({ scope: 'HUB' })
  })
})

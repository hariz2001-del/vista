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
      if (url.endsWith('/auth/register')) {
        return respond(200, { token: 'hub-token', user: { name: 'Kedai Baru', email: 'a@b.my' } })
      }
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
  it('registers a business, then opens the counter with a one-time code', async () => {
    render(<App />)

    const submit = screen.getByRole('button', { name: /create my business/i })
    expect(submit).toBeDisabled()

    type('Business name', 'Kedai Baru')
    type('Email', 'a@b.my')
    type('Password', 'short')
    expect(submit).toBeDisabled()
    type('Password', 'long enough password')
    type('Counter PIN', '12a34')
    // Only digits get in, and only four of them.
    expect(screen.getByLabelText('Counter PIN')).toHaveValue('1234')
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    await screen.findByText('Kedai Baru')
    expect(calls[0]?.body).toEqual({
      businessName: 'Kedai Baru',
      email: 'a@b.my',
      password: 'long enough password',
      pin: '1234',
    })

    fireEvent.click(screen.getByRole('button', { name: /open the counter/i }))
    await waitFor(() => expect(assign).toHaveBeenCalled())

    const handoff = calls.find((call) => call.url.endsWith('/auth/handoff'))
    expect(handoff).toMatchObject({ body: { target: 'POS' }, auth: 'Bearer hub-token' })
    // In the fragment, which the browser never sends to the POS's server.
    expect(assign).toHaveBeenCalledWith('https://pos.vistahub.my/#handoff=one-time-code')
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

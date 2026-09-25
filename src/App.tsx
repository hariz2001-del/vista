import { BookOpenText, LoaderCircle, LogOut, MonitorSmartphone } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ApiError,
  handoffUrl,
  register,
  signIn,
  type AppTarget,
  type HubSession,
} from './lib/api.ts'

/**
 * vistahub.my: register a business or sign in, then choose which app to open.
 *
 * Nothing here holds data. The POS and RMS each keep their own sign-in on
 * their own domain; this page hands the owner across with a one-time code.
 */

type Mode = 'register' | 'signin'

const APPS: Array<{
  target: AppTarget
  kicker: string
  title: string
  body: string
  icon: typeof BookOpenText
  accent: string
}> = [
  {
    target: 'POS',
    kicker: 'Counter · POS',
    title: 'Open the counter',
    body: 'Ring up sales on the tablet at the stall. It stays signed in, keeps selling without a connection, and the cashier only needs the PIN.',
    icon: MonitorSmartphone,
    accent: 'var(--color-food)',
  },
  {
    target: 'RMS',
    kicker: 'Owner books · RMS',
    title: 'Open the books',
    body: 'Sales as they happen, cash in and out, expenses, and your menu. Signed in for a working day.',
    icon: BookOpenText,
    accent: 'var(--color-drink)',
  },
]

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

/**
 * A labelled input. The hint is the input's description (`aria-describedby`
 * `<id>-hint`), not part of its name, so a screen reader says "Password" and
 * then the rule — not the rule as the field's name.
 */
function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="vista-field-label">
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function RegisterForm({ onDone }: { onDone: (session: HubSession) => void }) {
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const passwordShort = password.length > 0 && password.length < 12
  const pinInvalid = pin.length > 0 && !/^\d{4}$/.test(pin)
  const canSubmit =
    businessName.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 12 &&
    /^\d{4}$/.test(pin)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      onDone(await register({ businessName: businessName.trim(), email: email.trim(), password, pin }))
    } catch (caught) {
      setError(messageOf(caught))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4" noValidate>
      <Field id="reg-name" label="Business name" hint="What your customers call you. You can change it later.">
        <input
          id="reg-name"
          aria-describedby="reg-name-hint"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          autoComplete="organization"
          maxLength={80}
          className="vista-control w-full px-3"
        />
      </Field>
      <Field id="reg-email" label="Email" hint="You sign in with this, at the counter and in the books.">
        <input
          id="reg-email"
          aria-describedby="reg-email-hint"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          className="vista-control w-full px-3"
        />
      </Field>
      <Field
        id="reg-password"
        label="Password"
        hint={passwordShort ? `${12 - password.length} more characters.` : 'At least 12 characters.'}
      >
        <input
          id="reg-password"
          aria-describedby="reg-password-hint"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          aria-invalid={passwordShort}
          className="vista-control w-full px-3"
        />
      </Field>
      <Field
        id="reg-pin"
        label="Counter PIN"
        hint={pinInvalid ? 'Exactly 4 digits.' : 'The cashier types this to open and close a shift. 4 digits.'}
      >
        <input
          id="reg-pin"
          aria-describedby="reg-pin-hint"
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={pinInvalid}
          className="vista-control w-32 px-3 font-mono tracking-[0.4em]"
        />
      </Field>

      <p className="min-h-5 text-sm font-bold text-critical" role="alert">
        {error ?? ''}
      </p>

      <button
        type="submit"
        disabled={!canSubmit || busy}
        className="vista-button-primary flex w-full items-center justify-center gap-2"
      >
        {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        Create my business
      </button>
    </form>
  )
}

function SignInForm({ onDone, notice }: { onDone: (session: HubSession) => void; notice: string | null }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(notice)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !email.trim() || !password) return
    setBusy(true)
    setError(null)
    try {
      onDone(await signIn(email.trim(), password))
    } catch (caught) {
      setError(messageOf(caught))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <Field id="signin-email" label="Email">
        <input
          id="signin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          className="vista-control w-full px-3"
        />
      </Field>
      <Field id="signin-password" label="Password">
        <input
          id="signin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="vista-control w-full px-3"
        />
      </Field>

      <p className="min-h-5 text-sm font-bold text-critical" role="alert">
        {error ?? ''}
      </p>

      <button
        type="submit"
        disabled={busy || !email.trim() || !password}
        className="vista-button-primary flex w-full items-center justify-center gap-2"
      >
        {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : null}
        Sign in
      </button>
    </form>
  )
}

function AppPicker({
  session,
  onSignOut,
  onExpired,
}: {
  session: HubSession
  onSignOut: () => void
  onExpired: (message: string) => void
}) {
  const [opening, setOpening] = useState<AppTarget | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function open(target: AppTarget) {
    if (opening) return
    setOpening(target)
    setError(null)
    try {
      window.location.assign(await handoffUrl(session, target))
    } catch (caught) {
      setOpening(null)
      if (caught instanceof ApiError && caught.code === 'auth:UNAUTHORIZED') {
        onExpired('That sign-in has timed out. Sign in again to choose an app.')
        return
      }
      setError(messageOf(caught))
    }
  }

  return (
    <div>
      <p className="page-kicker">Signed in</p>
      <p className="mt-1 truncate text-lg font-black">{session.user.name}</p>
      <p className="truncate text-sm text-muted">{session.user.email}</p>

      <ul className="mt-6 divide-y divide-line border-y border-line">
        {APPS.map((app) => {
          const Icon = app.icon
          const isOpening = opening === app.target
          return (
            <li key={app.target}>
              <button
                type="button"
                onClick={() => void open(app.target)}
                disabled={opening !== null}
                className="group flex w-full items-start gap-4 border-l-4 bg-surface px-4 py-5 text-left transition-colors hover:bg-canvas disabled:opacity-70"
                style={{ borderLeftColor: app.accent }}
              >
                {isOpening ? (
                  <LoaderCircle aria-hidden="true" className="mt-1 size-6 shrink-0 animate-spin text-muted" />
                ) : (
                  <Icon aria-hidden="true" strokeWidth={1.6} className="mt-1 size-6 shrink-0 text-ink" />
                )}
                <span className="min-w-0">
                  <span className="page-kicker block">{app.kicker}</span>
                  <span className="mt-1 block font-display text-2xl font-bold tracking-[-0.03em]">
                    {app.title}
                  </span>
                  <span className="mt-1 block text-sm leading-relaxed text-muted">{app.body}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 min-h-5 text-sm font-bold text-critical" role="alert">
        {error ?? ''}
      </p>

      <button
        type="button"
        onClick={onSignOut}
        className="mt-2 flex min-h-11 items-center gap-2 text-sm font-bold text-muted underline hover:text-ink"
      >
        <LogOut aria-hidden="true" className="size-4" /> Sign out
      </button>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<HubSession | null>(null)
  const [mode, setMode] = useState<Mode>('register')
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <div className="paper-canvas flex min-h-dvh flex-col">
      <header className="bg-rail text-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-baseline gap-2 px-4 py-4 sm:px-6">
          <span className="font-display text-2xl font-bold tracking-[-0.06em]">Vista</span>
          <span className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] text-food">
            vistahub.my
          </span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:py-16">
        <section className="max-w-xl">
          <p className="page-kicker">Counter register · owner&apos;s books</p>
          <h1 className="mt-2 text-4xl leading-[1.05] sm:text-5xl">
            One account for the counter and the books.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Vista is built for a food stall. The tablet at the counter rings up each sale and takes
            DuitNow QR. Every sale shows up in the owner&apos;s books a few seconds later, next to
            the cash, the expenses and the menu.
          </p>

          <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted">
                Counter
              </dt>
              <dd>Keeps selling when the connection drops, and sends the sales once it is back.</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted">
                Cashier
              </dt>
              <dd>Needs only a 4-digit PIN. The tablet stays signed in until you sign it out.</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted">
                Your books
              </dt>
              <dd>Only you can see them. Every business on Vista is kept completely separate.</dd>
            </div>
          </dl>
        </section>

        <section
          aria-label={session ? 'Choose an app' : mode === 'register' ? 'Register' : 'Sign in'}
          className="self-start border border-line bg-surface p-6 shadow-[0_1px_0_rgba(24,33,29,0.04)]"
        >
          {session ? (
            <AppPicker
              session={session}
              onSignOut={() => {
                setSession(null)
                setMode('signin')
              }}
              onExpired={(message) => {
                setSession(null)
                setMode('signin')
                setNotice(message)
              }}
            />
          ) : (
            <>
              <div className="mb-6 grid grid-cols-2 border border-line" role="group" aria-label="Register or sign in">
                {(['register', 'signin'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={mode === option}
                    onClick={() => {
                      setMode(option)
                      setNotice(null)
                    }}
                    className={`min-h-11 text-sm font-bold transition-colors ${
                      mode === option ? 'bg-rail text-white' : 'bg-surface text-muted hover:text-ink'
                    }`}
                  >
                    {option === 'register' ? 'New business' : 'Sign in'}
                  </button>
                ))}
              </div>
              {mode === 'register' ? (
                <RegisterForm onDone={setSession} />
              ) : (
                <SignInForm key={notice ?? ''} onDone={setSession} notice={notice} />
              )}
            </>
          )}
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          Figures in Vista are an operating record, not accounting advice.
        </p>
      </footer>
    </div>
  )
}

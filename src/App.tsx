import { ArrowUpRight, BookOpenText, LoaderCircle, LogOut, MessageCircle, MonitorSmartphone } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  ApiError,
  handoffUrl,
  signIn,
  type AppTarget,
  type HubSession,
} from './lib/api.ts'

/**
 * vistahub.my: get in touch to use Vista, or sign in and choose which app to open.
 *
 * Nothing here holds data. The POS and RMS each keep their own sign-in on
 * their own domain; this page hands the owner across with a one-time code.
 */

type Mode = 'contact' | 'signin'

/** WhatsApp, in international form without the plus (e.g. 60123456789). */
const WHATSAPP_NUMBER = ''
const WHATSAPP_TEXT = 'Hi, I’m interested in Vista for my business.'

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

/**
 * The public demos: the same apps as the real ones, built in demo mode, with
 * months of made-up trading and no sign-in. Each visitor's demo lives in their
 * own browser and starts fresh every 3 hours.
 */
const DEMOS: Array<{
  href: string
  kicker: string
  title: string
  body: string
  icon: typeof BookOpenText
  accent: string
}> = [
  {
    href: import.meta.env.VITE_DEMO_POS_URL ?? 'https://demopos.vistahub.my',
    kicker: 'Demo · Counter POS',
    title: 'Try the counter',
    body: 'A shift already open and today\u2019s first dozen sales rung up. Take orders, add options and discounts, mark them paid, look back through the receipts, and do the closing stock count.',
    icon: MonitorSmartphone,
    accent: 'var(--color-food)',
  },
  {
    href: import.meta.env.VITE_DEMO_RMS_URL ?? 'https://demorms.vistahub.my',
    kicker: 'Demo · Owner books RMS',
    title: 'Try the books',
    body: 'Four months of a real-looking stall: daily sales, what sold, cash in and out, expenses, what each partner is owed and has taken out, the staff roster and payroll, and the closing stock counts.',
    icon: BookOpenText,
    accent: 'var(--color-drink)',
  },
]

/**
 * Two walkthroughs with a voice-over: Vista itself, and Chopper, the receipt
 * bot on Telegram. Files are served from /videos; nothing loads until played.
 */
const VIDEOS: Array<{ src: string; poster: string; kicker: string; title: string; body: string; length: string }> = [
  {
    src: '/videos/vista-demo.mp4',
    poster: '/videos/vista-demo.jpg',
    kicker: 'Video · 5 min',
    title: 'Vista, start to finish',
    body: 'The counter, the books, stock counts, rosters and payroll, and the Team app on a phone.',
    length: '5:15',
  },
  {
    src: '/videos/chopper-demo.mp4',
    poster: '/videos/chopper-demo.jpg',
    kicker: 'Video · under 2 min',
    title: 'Chopper, the receipt bot',
    body: 'Send a bill on Telegram; it is read, booked into Vista and filed in Google Drive. Ask it for sales, the stock PDF or the roster.',
    length: '1:43',
  },
]

function VideoSection() {
  return (
    <section aria-labelledby="video-title" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <p className="page-kicker">See it in action</p>
        <h2 id="video-title" className="mt-2 text-3xl leading-tight sm:text-4xl">
          Watch a stall run on Vista.
        </h2>
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {VIDEOS.map((video) => (
            <li key={video.src} className="flex flex-col border border-line bg-surface">
              <video
                controls
                preload="none"
                playsInline
                poster={video.poster}
                className="aspect-video w-full bg-ink object-contain"
                aria-label={`${video.title} (${video.length}, with voice-over and subtitles)`}
              >
                <source src={video.src} type="video/mp4" />
              </video>
              <div className="px-4 py-4">
                <p className="page-kicker">{video.kicker}</p>
                <h3 className="mt-1 font-display text-2xl font-bold tracking-[-0.03em]">{video.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{video.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function DemoSection() {
  return (
    <section aria-labelledby="demo-title" className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <p className="page-kicker">No sign-up</p>
        <h2 id="demo-title" className="mt-2 text-3xl leading-tight sm:text-4xl">
          Try it with a demo stall first.
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          The same Vista as the real thing, filled with made-up trading and already signed in.
          Anything you change stays in your own browser, and the demo starts fresh every 3 hours.
        </p>

        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {DEMOS.map((demo) => {
            const Icon = demo.icon
            return (
              <li key={demo.href}>
                <a
                  href={demo.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full items-start gap-4 border border-line border-l-4 bg-canvas px-4 py-5 transition-colors hover:bg-white"
                  style={{ borderLeftColor: demo.accent }}
                >
                  <Icon aria-hidden="true" strokeWidth={1.6} className="mt-1 size-6 shrink-0 text-ink" />
                  <span className="min-w-0 flex-1">
                    <span className="page-kicker block">{demo.kicker}</span>
                    <span className="mt-1 flex items-center gap-1.5 font-display text-2xl font-bold tracking-[-0.03em]">
                      {demo.title}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="size-5 text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                      />
                    </span>
                    <span className="mt-1 block text-sm leading-relaxed text-muted">{demo.body}</span>
                    <span className="mt-3 block text-xs font-bold text-ink">
                      Opens in a new tab<span className="sr-only"> — {demo.href}</span>
                    </span>
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

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

/** No sign-up here: businesses get in touch, to use Vista as it is or have it built for them. */
function ContactPanel({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div>
      <p className="page-kicker">Get Vista</p>
      <h2 className="mt-1 text-2xl leading-tight">Want Vista for your business?</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        Use Vista as it is, or have it built and tailored for your business: your name, your menu, your way of
        working. Message me and we&apos;ll set it up.
      </p>
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="vista-button-primary mt-5 flex min-h-12 w-full items-center justify-center gap-2"
      >
        <MessageCircle aria-hidden="true" className="size-5" /> Contact me on WhatsApp
      </a>
      <div className="mt-6 border-t border-line pt-4 text-sm text-muted">
        Already using Vista?{' '}
        <button type="button" onClick={onSignIn} className="font-bold text-ink underline underline-offset-2">
          Sign in
        </button>
      </div>
    </div>
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
  const [mode, setMode] = useState<Mode>('contact')
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
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted">
                Team
              </dt>
              <dd>Rosters, shift picks, attendance and payroll. Staff sign in on their phone with a PIN.</dd>
            </div>
            <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3 py-3">
              <dt className="font-mono text-xs font-bold uppercase tracking-[0.06em] text-muted">
                Stock
              </dt>
              <dd>A quick closing count at the counter, so tomorrow&apos;s restock is planned from what is left.</dd>
            </div>
          </dl>
        </section>

        <section
          aria-label={session ? 'Choose an app' : mode === 'contact' ? 'Get Vista' : 'Sign in'}
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
          ) : mode === 'contact' ? (
            <ContactPanel onSignIn={() => setMode('signin')} />
          ) : (
            <>
              <SignInForm key={notice ?? ''} onDone={setSession} notice={notice} />
              <button type="button" onClick={() => setMode('contact')} className="mt-4 text-sm font-bold text-muted underline underline-offset-2 hover:text-ink">
                New to Vista? Get in touch
              </button>
            </>
          )}
        </section>
      </main>

      <VideoSection />
      <DemoSection />

      <footer className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          Figures in Vista are an operating record, not accounting advice.
        </p>
      </footer>
    </div>
  )
}

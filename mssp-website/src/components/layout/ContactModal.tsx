import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, X } from 'lucide-react'
import { services } from '../../data/content'
import { setScrollLock } from '../../hooks/useSmoothScroll'
import { useUI } from '../../lib/store'
import { Button } from '../ui/Button'

const COPY = {
  assessment: {
    title: 'Request a Threat Assessment',
    lead: 'Our analysts will review your attack surface and deliver a prioritised exposure report — no cost, no obligation.',
    cta: 'Request assessment',
  },
  demo: {
    title: 'Book a Live SOC Demo',
    lead: 'See our analysts, detection engine, and response playbooks operate on real-world attack scenarios.',
    cta: 'Book my demo',
  },
}

const field =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-neon-cyan/60 focus:bg-white/[0.05] focus:shadow-[0_0_0_4px_rgba(34,227,255,0.12)]'

/** Accessible glass dialog for "Request Assessment" and "Book Demo". */
export function ContactModal() {
  const intent = useUI((s) => s.contact)
  const close = useUI((s) => s.closeContact)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [interests, setInterests] = useState<string[]>([])
  const dialog = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()

  useEffect(() => {
    if (!intent) return
    restoreFocus.current = document.activeElement as HTMLElement
    setScrollLock('modal', true)
    setStatus('idle')
    const t = window.setTimeout(() => dialog.current?.querySelector<HTMLElement>('input, button')?.focus(), 60)

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key !== 'Tab' || !dialog.current) return
      const focusable = dialog.current.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href]')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      setScrollLock('modal', false)
      restoreFocus.current?.focus?.()
    }
  }, [intent, close])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setStatus('sending')
    // Replace with your CRM / marketing-automation endpoint.
    window.setTimeout(() => setStatus('done'), 1400)
  }

  const copy = intent ? COPY[intent] : COPY.demo

  return (
    <AnimatePresence>
      {intent && (
        <motion.div
          key="contact"
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-default bg-void/70 backdrop-blur-md" onClick={close} tabIndex={-1} />
          <motion.div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-lenis-prevent
            initial={{ opacity: 0, y: 40, scale: 0.96, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformPerspective: 1200 }}
            className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl glass-strong glow-border"
          >
            <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-neon-blue/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-neon-purple/20 blur-3xl" />
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <div className="relative p-6 sm:p-9">
              <AnimatePresence mode="wait">
                {status === 'done' ? (
                  <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-10 text-center">
                    <motion.div
                      initial={{ scale: 0.4, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 14 }}
                      className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-safe/15 text-safe shadow-[0_0_40px_-6px_rgba(52,211,153,0.7)]"
                    >
                      <CheckCircle2 className="h-8 w-8" />
                    </motion.div>
                    <h3 className="mt-6 text-2xl font-semibold">Request received</h3>
                    <p className="mx-auto mt-3 max-w-sm text-sm text-slate-400">
                      A security specialist will reach out within one business day. For an active incident, call our 24/7 hotline.
                    </p>
                    <Button variant="ghost" className="mt-8" onClick={close}>
                      Back to site
                    </Button>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-3 py-1 font-mono text-[10px] tracking-[0.2em] text-neon-cyan uppercase">
                      <ShieldCheck className="h-3.5 w-3.5" /> Encrypted submission
                    </div>
                    <h3 id={titleId} className="mt-4 pr-8 text-2xl font-semibold sm:text-[1.75rem]">
                      {copy.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{copy.lead}</p>

                    <div className="mt-7 grid gap-3 sm:grid-cols-2">
                      <label className="sr-only" htmlFor="cf-name">Full name</label>
                      <input id="cf-name" required autoComplete="name" placeholder="Full name" className={field} />
                      <label className="sr-only" htmlFor="cf-email">Work email</label>
                      <input id="cf-email" required type="email" autoComplete="email" placeholder="Work email" className={field} />
                      <label className="sr-only" htmlFor="cf-company">Company</label>
                      <input id="cf-company" required autoComplete="organization" placeholder="Company" className={field} />
                      <label className="sr-only" htmlFor="cf-size">Company size</label>
                      <select id="cf-size" defaultValue="" required className={`${field} appearance-none`}>
                        <option value="" disabled>
                          Company size
                        </option>
                        <option>1 – 250 employees</option>
                        <option>250 – 1,000 employees</option>
                        <option>1,000 – 10,000 employees</option>
                        <option>10,000+ employees</option>
                      </select>
                    </div>

                    <fieldset className="mt-5">
                      <legend className="font-mono text-[10px] tracking-[0.2em] text-slate-500 uppercase">Interested in</legend>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {services.map((s) => {
                          const on = interests.includes(s.id)
                          return (
                            <button
                              type="button"
                              key={s.id}
                              aria-pressed={on}
                              onClick={() => setInterests((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
                              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
                                on
                                  ? 'border-neon-cyan/60 bg-neon-cyan/15 text-white shadow-[0_0_18px_-6px_rgba(34,227,255,0.8)]'
                                  : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-slate-200'
                              }`}
                            >
                              {s.title}
                            </button>
                          )
                        })}
                      </div>
                    </fieldset>

                    <label className="sr-only" htmlFor="cf-msg">What would you like to discuss?</label>
                    <textarea id="cf-msg" rows={3} placeholder="What would you like to discuss? (optional)" className={`${field} mt-5 resize-none`} />

                    <div className="mt-6 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-[11px] leading-relaxed text-slate-500">We never share your details. See our privacy notice.</p>
                      <Button type="submit" disabled={status === 'sending'} icon={status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}>
                        {status === 'sending' ? 'Submitting' : copy.cta}
                      </Button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

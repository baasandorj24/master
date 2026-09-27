import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Menu, Siren, X } from 'lucide-react'
import { contact, navLinks } from '../../data/content'
import { useActiveStation, useScrolledPast } from '../../hooks/useScrollState'
import { scrollToTarget, setScrollLock } from '../../hooks/useSmoothScroll'
import { useUI } from '../../lib/store'
import { Button } from '../ui/Button'
import { Logo } from '../ui/Logo'

export function Navbar() {
  const scrolled = useScrolledPast(40)
  const active = useActiveStation()
  const ready = useUI((s) => s.ready)
  const openContact = useUI((s) => s.openContact)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setScrollLock('menu', open)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (href: string) => {
    setOpen(false)
    setScrollLock('menu', false)
    scrollToTarget(href)
  }

  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : undefined}
      transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <div className="mx-auto max-w-7xl px-3 pt-3 sm:px-6 sm:pt-4 lg:px-8">
        <nav
          aria-label="Primary"
          className={`flex h-15 items-center justify-between rounded-2xl pr-2 pl-4 transition-[background,border-color,box-shadow,backdrop-filter] duration-500 sm:pr-2.5 sm:pl-5 ${
            scrolled || open ? 'glass-strong' : 'border border-transparent'
          }`}
        >
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault()
              go('#top')
            }}
            className="rounded-lg"
            aria-label="Aetherguard home"
          >
            <Logo />
          </a>

          <ul className="hidden items-center gap-0.5 lg:flex">
            {navLinks.map((l) => {
              const isActive = active === l.station
              return (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault()
                      go(l.href)
                    }}
                    className={`relative block rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors duration-300 ${
                      isActive ? 'text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full border border-neon-cyan/25 bg-neon-cyan/[0.08] shadow-[0_0_20px_-6px_rgba(34,227,255,0.6)]"
                        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                      />
                    )}
                    <span className="relative">{l.label}</span>
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href={`tel:${contact.hotline.replace(/[^+\d]/g, '')}`}
              className="hidden items-center gap-2 rounded-full border border-threat/30 bg-threat/10 px-3.5 py-2 text-[12.5px] font-medium text-rose-200 transition-colors hover:border-threat/60 hover:bg-threat/20 xl:inline-flex"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-threat opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-threat" />
              </span>
              Under attack?
            </a>
            <Button size="sm" className="hidden sm:inline-flex" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => openContact('demo')}>
              Book Demo
            </Button>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="grid h-10 w-10 place-items-center rounded-xl text-slate-200 transition-colors hover:bg-white/5 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
            transition={{ duration: 0.35 }}
            className="mx-3 mt-2 rounded-2xl p-3 glass-strong sm:mx-6 lg:hidden"
            data-lenis-prevent
          >
            <ul className="grid gap-1">
              {navLinks.map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault()
                      go(l.href)
                    }}
                    className="flex items-center justify-between rounded-xl px-4 py-3.5 font-display text-lg text-slate-100 transition-colors hover:bg-white/5"
                  >
                    {l.label}
                    <span className="font-mono text-xs text-neon-cyan/70">0{l.station}</span>
                  </a>
                </motion.li>
              ))}
            </ul>
            <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
              <Button
                size="md"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => {
                  setOpen(false)
                  openContact('demo')
                }}
              >
                Book Demo
              </Button>
              <a
                href={`tel:${contact.hotline.replace(/[^+\d]/g, '')}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-threat/40 bg-threat/10 text-sm font-medium text-rose-200"
              >
                <Siren className="h-4 w-4" /> Incident hotline
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}

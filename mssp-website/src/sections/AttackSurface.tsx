import { motion } from 'framer-motion'
import { AlertTriangle, AppWindow, Cloud, Laptop, Server, UserRound, type LucideIcon } from 'lucide-react'
import { assetCategories } from '../data/content'
import { useUI, type AssetCategory } from '../lib/store'
import { FadeIn } from '../components/ui/Motion'
import { SectionHeader } from '../components/ui/SectionHeader'

const icons: Record<AssetCategory, LucideIcon> = {
  endpoint: Laptop,
  cloud: Cloud,
  server: Server,
  saas: AppWindow,
  user: UserRound,
}

export function AttackSurface() {
  const hovered = useUI((s) => s.hoveredAsset)
  const setHovered = useUI((s) => s.setHoveredAsset)

  return (
    <section id="attack-surface" data-station="1" aria-labelledby="attack-surface-title" className="relative flex min-h-screen items-center py-28 lg:py-36">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="lg:ml-auto lg:w-[47%]">
          <SectionHeader
            index="01"
            eyebrow="Attack Surface"
            titleId="attack-surface-title"
            title={[{ text: 'See every asset.' }, { text: 'Guard every path.', className: 'text-gradient', block: true }]}
            description="Your perimeter is now a living mesh of endpoints, cloud workloads, servers, SaaS applications, and identities. We continuously discover, map, and monitor every connection an adversary could exploit."
          />

          <FadeIn delay={0.2}>
            <p className="mt-8 font-mono text-[10px] tracking-[0.22em] text-slate-500 uppercase">
              <span className="hidden lg:inline">Hover an asset class — or a node in the network</span>
              <span className="lg:hidden">Tap an asset class to highlight it</span>
            </p>
          </FadeIn>
          <ul className="mt-3 grid gap-2.5" onMouseLeave={() => setHovered(null)}>
            {assetCategories.map((cat, i) => {
              const Icon = icons[cat.id]
              const active = hovered === cat.id
              return (
                <motion.li
                  key={cat.id}
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '0px 0px -8% 0px' }}
                  transition={{ duration: 0.8, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setHovered(cat.id)}
                    onFocus={() => setHovered(cat.id)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setHovered(active ? null : cat.id)}
                    aria-pressed={active}
                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl px-4 py-3.5 text-left transition-all duration-500 glass max-lg:bg-void/55 ${
                      active ? '!border-white/25 bg-white/[0.06]' : ''
                    }`}
                    style={{ boxShadow: active ? `0 0 40px -12px ${cat.color}, inset 0 0 0 1px ${cat.color}40` : undefined }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-[3px] transition-all duration-500"
                      style={{ background: cat.color, opacity: active ? 1 : 0.35, boxShadow: active ? `0 0 14px ${cat.color}` : 'none' }}
                    />
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-transform duration-500 group-hover:scale-110"
                      style={{ color: cat.color, borderColor: `${cat.color}40`, background: `${cat.color}14` }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-[15px] font-semibold text-white">{cat.label}</span>
                        <span className="font-mono text-xs text-slate-400 tabular-nums">{cat.count}</span>
                      </span>
                      <span className="mt-0.5 block text-[13px] leading-snug text-slate-400">{cat.description}</span>
                    </span>
                  </button>
                </motion.li>
              )
            })}
          </ul>

          <FadeIn delay={0.3}>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-[12px]">
              {['Continuous discovery', 'Exposure scoring', 'Shadow IT detection'].map((t) => (
                <span key={t} className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-slate-300">
                  {t}
                </span>
              ))}
              <span className="inline-flex items-center gap-1.5 rounded-full border border-threat/30 bg-threat/10 px-3 py-1 text-rose-200">
                <AlertTriangle className="h-3.5 w-3.5" /> 3 exposures · remediation queued
              </span>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

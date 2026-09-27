import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { BrainCircuit, ChevronRight } from 'lucide-react'
import { detection } from '../data/content'
import { CountUp, FadeIn } from '../components/ui/Motion'
import { SectionHeader } from '../components/ui/SectionHeader'
import { TiltCard } from '../components/ui/TiltCard'

export function DetectionEngine() {
  return (
    <section id="detection" data-station="2" aria-labelledby="detection-title" className="relative flex min-h-screen items-center py-28 lg:py-36">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <div className="lg:w-[48%]">
          <SectionHeader
            index="02"
            eyebrow="AI Detection Engine"
            titleId="detection-title"
            title={[{ text: 'An AI engine' }, { text: 'that never blinks.', className: 'text-gradient', block: true }]}
            description="Billions of raw signals stream into our detection fabric every day. Behavioural models, graph analytics, and adversary-informed rules correlate them in milliseconds — surfacing the threats that matter and discarding the noise."
          />

          <FadeIn delay={0.15}>
            <ol className="mt-8 flex flex-wrap items-center gap-1.5" aria-label="Detection pipeline">
              {detection.pipeline.map((step, i) => (
                <Fragment key={step}>
                  <motion.li
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i + 0.2, type: 'spring', stiffness: 260, damping: 20 }}
                    className={`rounded-lg border px-3 py-1.5 font-mono text-[11px] tracking-wider uppercase ${
                      i === detection.pipeline.length - 2
                        ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan shadow-[0_0_20px_-6px_rgba(34,227,255,0.8)]'
                        : 'border-white/10 bg-white/[0.03] text-slate-300'
                    }`}
                  >
                    {step}
                  </motion.li>
                  {i < detection.pipeline.length - 1 && (
                    <li aria-hidden>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                    </li>
                  )}
                </Fragment>
              ))}
            </ol>
          </FadeIn>

          <div className="mt-9 grid gap-3 sm:grid-cols-3">
            {detection.counters.map((c, i) => (
              <FadeIn key={c.label} delay={0.12 * i}>
                <TiltCard className="h-full rounded-2xl" max={12}>
                  <div className="p-5">
                    <div className="font-display text-[2.4rem] leading-none font-semibold text-white tilt-depth-2">
                      <CountUp value={c.value} decimals={c.decimals ?? 0} suffix={c.suffix} className="text-gradient" />
                    </div>
                    <div className="mt-3 text-sm font-semibold text-slate-100 tilt-depth-2">{c.label}</div>
                    <div className="mt-1 text-[12.5px] leading-snug text-slate-400 tilt-depth-1">{c.sub}</div>
                  </div>
                </TiltCard>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.25}>
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-[13px] leading-relaxed text-slate-400">
              <BrainCircuit className="mt-0.5 h-5 w-5 shrink-0 text-neon-purple" />
              <p>
                Every model decision is explainable: analysts see the features, graph edges, and ATT&amp;CK techniques behind each verdict —
                <span className="text-slate-200"> no black boxes.</span>
              </p>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Quote } from 'lucide-react'
import { metrics } from '../data/content'
import { prefersReducedMotion } from '../lib/device'
import { FadeIn, RollingNumber } from '../components/ui/Motion'
import { SectionHeader } from '../components/ui/SectionHeader'
import { TiltCard } from '../components/ui/TiltCard'

gsap.registerPlugin(ScrollTrigger)

export function SuccessMetrics() {
  const row = useRef<HTMLDivElement>(null)

  // Metric cards swing up out of the floor in 3D as they scroll into view.
  useLayoutEffect(() => {
    const el = row.current
    if (!el || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('[data-metric-column]').forEach((card, i) => {
        gsap.fromTo(
          card,
          { rotateX: 62, y: 140, z: -200, opacity: 0 },
          {
            rotateX: 0,
            y: 0,
            z: 0,
            opacity: 1,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: `top ${92 - i * 4}%`, end: 'top 45%', scrub: 1 },
          },
        )
      })
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <section id="results" data-station="6" aria-labelledby="results-title" className="relative flex min-h-screen items-center py-28 lg:py-36">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <SectionHeader
          index="06"
          eyebrow="Customer Success"
          titleId="results-title"
          align="center"
          title={[{ text: 'Measured in outcomes,' }, { text: 'not alerts.', className: 'text-gradient', block: true }]}
        />

        <div ref={row} className="mt-16 grid gap-4 [perspective:1400px] md:grid-cols-3 lg:gap-6">
          {metrics.primary.map((m) => (
            <div key={m.label} data-metric-column>
              <TiltCard className="rounded-3xl" surfaceClassName="glass !bg-white/[0.02] !backdrop-blur-[6px]" glareColor={`${m.color}30`}>
                <div className="px-6 py-8 text-center sm:py-10">
                  <div
                    className="font-display text-[3.4rem] leading-none font-semibold tracking-tight tilt-depth-3 sm:text-6xl lg:text-[4.3rem]"
                    style={{ color: m.color, filter: `drop-shadow(0 0 22px ${m.color}66)` }}
                  >
                    <RollingNumber value={m.value} />
                  </div>
                  <div className="mt-4 text-lg font-semibold text-white tilt-depth-2">{m.label}</div>
                  <div className="mx-auto mt-1.5 max-w-[16rem] text-[13px] leading-snug text-slate-400 tilt-depth-1">{m.sub}</div>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>

        <FadeIn delay={0.1}>
          <dl className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
            {metrics.secondary.map((s) => (
              <div key={s.label} className="rounded-2xl px-4 py-3.5 text-center glass">
                <dd className="font-display text-xl font-semibold text-white">{s.value}</dd>
                <dt className="mt-0.5 text-[12px] text-slate-400">{s.label}</dt>
              </div>
            ))}
          </dl>
        </FadeIn>

        <FadeIn delay={0.15}>
          <figure className="relative mx-auto mt-14 max-w-3xl overflow-hidden rounded-3xl p-7 text-center glass-strong glow-border sm:p-10">
            <Quote className="mx-auto h-8 w-8 text-neon-cyan/70" aria-hidden />
            <blockquote className="mt-4 font-display text-lg leading-relaxed text-slate-100 sm:text-[1.35rem]">“{metrics.testimonial.quote}”</blockquote>
            <figcaption className="mt-6 text-sm">
              <span className="font-semibold text-white">{metrics.testimonial.author}</span>
              <span className="text-slate-500"> · {metrics.testimonial.company}</span>
            </figcaption>
          </figure>
        </FadeIn>
      </div>
    </section>
  )
}

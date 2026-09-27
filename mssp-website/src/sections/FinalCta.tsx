import { ArrowRight, CalendarClock, Check } from 'lucide-react'
import { useUI } from '../lib/store'
import { Button } from '../components/ui/Button'
import { FadeIn } from '../components/ui/Motion'
import { RevealText } from '../components/ui/RevealText'
import { Eyebrow } from '../components/ui/SectionHeader'

export function FinalCta() {
  const openContact = useUI((s) => s.openContact)
  return (
    <section id="contact" data-station="7" aria-labelledby="cta-title" className="relative pt-24 pb-20 lg:pt-36 lg:pb-28">
      <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
        <FadeIn>
          <div className="relative overflow-hidden rounded-[2rem] px-6 py-14 text-center glass-strong glow-border sm:px-14 sm:py-20">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
            <div className="pointer-events-none absolute -top-32 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-neon-blue/25 blur-[90px]" />
            <div className="relative">
              <Eyebrow className="justify-center">Ready when you are</Eyebrow>
              <RevealText
                id="cta-title"
                parts={[{ text: 'See what your SOC' }, { text: 'is missing.', className: 'text-gradient', block: true }]}
                className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-6xl"
              />
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                Get a complimentary threat assessment of your environment, or watch our analysts defend against a live attack simulation.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button size="lg" icon={<ArrowRight className="h-4 w-4" />} onClick={() => openContact('assessment')}>
                  Request Assessment
                </Button>
                <Button size="lg" variant="ghost" icon={<CalendarClock className="h-4 w-4 text-neon-cyan" />} onClick={() => openContact('demo')}>
                  Book Demo
                </Button>
              </div>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-slate-400">
                {['No agent install required', 'Findings in 5 business days', 'Mapped to MITRE ATT&CK'].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-safe" /> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

import { lazy, Suspense, useEffect, useState } from 'react'
import { MotionConfig } from 'framer-motion'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ContactModal } from './components/layout/ContactModal'
import { CursorGlow } from './components/layout/CursorGlow'
import { SceneErrorBoundary, StaticBackdrop } from './components/layout/Fallbacks'
import { Navbar } from './components/layout/Navbar'
import { Preloader } from './components/layout/Preloader'
import { ScrollHud } from './components/layout/ScrollHud'
import { setScrollLock, useSmoothScroll } from './hooks/useSmoothScroll'
import { hasWebGL, prefersReducedMotion } from './lib/device'
import { scroll } from './lib/scroll'
import { useUI } from './lib/store'
import { AttackSurface } from './sections/AttackSurface'
import { DetectionEngine } from './sections/DetectionEngine'
import { FinalCta } from './sections/FinalCta'
import { Footer } from './sections/Footer'
import { Hero } from './sections/Hero'
import { ServiceCatalog } from './sections/ServiceCatalog'
import { SocOperations } from './sections/SocOperations'
import { SuccessMetrics } from './sections/SuccessMetrics'
import { ThreatHunting } from './sections/ThreatHunting'

const Experience = lazy(() => import('./three/Experience'))

export default function App() {
  useSmoothScroll()
  const ready = useUI((s) => s.ready)
  const [webgl] = useState(hasWebGL)

  // Hold scroll during the boot sequence, then fly the camera in.
  useEffect(() => {
    setScrollLock('preloader', !ready)
    if (!ready) return
    window.scrollTo(0, 0)
    ScrollTrigger.refresh()
    if (prefersReducedMotion()) {
      scroll.intro = 1
      return
    }
    const tween = gsap.to(scroll, { intro: 1, duration: 3.2, ease: 'power3.out' })
    return () => {
      tween.kill()
    }
  }, [ready])

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        className="sr-only z-[70] rounded-lg bg-white px-4 py-2 text-sm font-medium text-black focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <div className="fixed inset-0 z-0" aria-hidden="true">
        {webgl ? (
          <SceneErrorBoundary fallback={<StaticBackdrop />}>
            <Suspense fallback={<StaticBackdrop />}>
              <Experience />
            </Suspense>
          </SceneErrorBoundary>
        ) : (
          <StaticBackdrop />
        )}
      </div>
      {/* Edge shading keeps HUD and nav legible over the scene. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(2,4,10,0.55))]" />
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[1] h-32 bg-gradient-to-b from-void/80 to-transparent" />

      <CursorGlow />
      <Navbar />
      <ScrollHud />

      <main id="main" tabIndex={-1} className="relative z-10 outline-none">
        <Hero />
        <AttackSurface />
        <DetectionEngine />
        <SocOperations />
        <ThreatHunting />
        <ServiceCatalog />
        <SuccessMetrics />
        <FinalCta />
      </main>
      <div className="relative z-10">
        <Footer />
      </div>

      <ContactModal />
      <Preloader />
    </MotionConfig>
  )
}

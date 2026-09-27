# Aetherguard — Immersive MSSP Website

A premium, enterprise-grade marketing site for a Managed Security Service Provider (MSSP).
Scrolling flies a camera through a single, persistent 3D "cyber-defence ecosystem",
with each page section parked at its own 3D station.

**Stack:** React 19 · TypeScript · Vite · Three.js · React Three Fiber + drei ·
@react-three/postprocessing · GSAP (ScrollTrigger) · Framer Motion · Lenis · Tailwind CSS v4 · Zustand

```bash
cd mssp-website
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build to dist/
npm run preview    # serve the production build
```

Requires Node 20.19+ (Vite 8).

## The experience

| # | Section | 3D station | Interactions |
|---|---------|------------|--------------|
| 0 | **Hero**: "Continuous Protection. Intelligent Detection. Rapid Response." | Dotted holographic globe in a geodesic energy shield, gyroscopic orbit rings, and incoming threats that ripple the shield on impact | Live UTC clock, blocked-threat ticker, live detection feed (≥1536px), pointer-tilted core |
| 1 | **Attack Surface** | Endpoints, cloud workloads, servers, SaaS apps, and identities wired to an organisation core by flowing network paths, with a periodic discovery scan | Hover a legend row **or** a 3D node: highlights the class in both places, with a node tooltip |
| 2 | **AI Detection Engine** | Holographic neural network, data streams spiralling in (malicious packets in red), plasma AI core | Count-up counters (10B+, 24/7, 99.9%) on tilt cards |
| 3 | **SOC Operations** | Command floor with holo-table globe, hologram analysts, and five live canvas-rendered dashboards | SIEM / XDR / SOAR / NDR / Threat Intel tabs (keyboard arrows supported) sync with the 3D screens; clicking a 3D screen selects it; auto-cycles until the visitor interacts |
| 4 | **Threat Hunting** | 3D kill chain. A threat travels Initial Access → Lateral Movement → Privilege Escalation → Exfiltration; a hunter reticle tracks it, and at Response a containment shockwave turns the chain cyan | Pinned, scroll-scrubbed timeline with stage details (MITRE ATT&CK tactic IDs) |
| 5 | **Service Catalog** | Orbiting hex monoliths over a pulsing hex-grid floor | Six glass cards with 3D tilt, cursor glare, specular rim, and parallax layers |
| 6 | **Customer Success** | Holographic data towers that rise as the section enters, aligned under the metric cards | Slot-machine rolling numbers; cards swing up in 3D on scroll |
| 7 | **CTA + Footer** | A vast protected planet on the horizon | Dot-matrix world map with pulsing SOC locations and animated links, contact details, socials, certification badges |

Between stations the camera flies an arcing path with a slight roll. Glowing data conduits link
the stations, and velocity-stretched warp streaks appear during the flight.

## Architecture

```
src/
  App.tsx                  page composition, preloader → intro fly-in
  data/content.ts          ALL copy, metrics, services, locations, contact info
  data/worldMask.ts        generated 1° land mask (globe + footer map)
  lib/scroll.ts            scroll director: page scroll → continuous "station" value
  lib/store.ts             Zustand UI state shared by DOM and 3D (hovered asset, SOC module…)
  hooks/useSmoothScroll.ts Lenis + GSAP ticker + ScrollTrigger integration, scroll locks
  sections/                one component per page section (DOM layer)
  components/ui|layout/    Button, TiltCard, RevealText, Navbar, HUD, modal, world map…
  three/
    Experience.tsx         the single fixed <Canvas>, lighting, bloom, quality tiers
    CameraRig.tsx          station-to-station flight, framing, pointer parallax
    stations.ts            world layout + per-station camera/framing (desktop & mobile)
    Station.tsx            per-station culling / presence
    scenes/                one 3D scene per section
    objects/               Globe, particles, warp streaks, conduits, hex floor, primitives
    materials/shared.ts    shared GLSL (fresnel, flow, hologram, fog-aware additive)
```

How the scroll storytelling works:

1. Every section has a `data-station` index. `lib/scroll.ts` measures them and turns the scroll
   position into a continuous `station` value. It holds on a station while that section fills the
   viewport and interpolates between stations during the scroll between sections.
2. `CameraRig` reads that value each frame and interpolates camera pose between stations, easing
   and damping it. It then applies an off-centre `setViewOffset` so the 3D object sits beside
   the copy on desktop and behind it on mobile.
3. Only the one or two stations near the camera are rendered.
4. GSAP ScrollTrigger drives the DOM-side reveals, parallax, and pinned timeline. Framer Motion
   handles component micro-interactions.

## Customising

- **Brand and copy:** edit `src/data/content.ts`. The brand name, every metric, the SOC locations,
  certifications, and the contact details are **placeholders**. Replace them with real, verifiable
  data before launch.
- **Colours and fonts:** `@theme` tokens in `src/styles/index.css`, and `palette` in
  `src/three/materials/shared.ts`.
- **Camera framing:** `src/three/stations.ts`, which sets the per-station camera offset, drift,
  and `screenX` (desktop) / `mobile` overrides.
- **Contact form:** `ContactModal.tsx` simulates submission. Wire `submit()` to your CRM or
  marketing-automation endpoint.
- **World map data:** `npm run generate:worldmap` regenerates `src/data/worldMask.ts` from Natural
  Earth (via `world-atlas`).

## Performance and accessibility

- One WebGL context for the whole page. The 3D bundle is code-split and lazy-loaded, so the page
  content renders first.
- Device quality tiers (particle counts, MSAA, DPR cap), plus `PerformanceMonitor`, which lowers
  DPR and bloom when frame rate drops.
- Falls back to a CSS backdrop if WebGL is unavailable or the scene errors.
- Respects `prefers-reduced-motion`: no preloader, native scrolling, no warp streaks, static
  headline reveals.
- Semantic landmarks, labelled sections, a skip link, a keyboard-operable tablist, and a
  focus-trapped modal (Esc closes it). The canvas is `aria-hidden`, and everything shown in 3D
  also has a DOM equivalent.

import { Component, type ErrorInfo, type ReactNode } from 'react'

/** CSS-only backdrop used when WebGL is unavailable or the 3D scene fails. */
export function StaticBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-void">
      <div className="absolute top-[-20%] left-[-10%] h-[70vh] w-[70vh] rounded-full bg-neon-purple/15 blur-[120px]" />
      <div className="absolute right-[-10%] bottom-[-20%] h-[80vh] w-[80vh] rounded-full bg-neon-blue/15 blur-[140px]" />
      <div className="absolute top-1/3 right-1/4 h-[40vh] w-[40vh] rounded-full bg-neon-cyan/10 blur-[100px]" />
      <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
    </div>
  )
}

export class SceneErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('3D experience disabled:', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

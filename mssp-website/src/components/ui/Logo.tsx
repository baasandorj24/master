import { useId } from 'react'
import { brand } from '../../data/content'

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  const id = useId()
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22e3ff" />
          <stop offset="0.55" stopColor="#2f7bff" />
          <stop offset="1" stopColor="#9b5cff" />
        </linearGradient>
        <filter id={`${id}-f`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" />
        </filter>
      </defs>
      <path
        d="M20 3.5 34 9.5v9.8c0 8.8-5.8 14.9-14 17.7C11.8 34.2 6 28.1 6 19.3V9.5Z"
        fill="none"
        stroke={`url(#${id}-g)`}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M13.6 26.5 20 12.5l6.4 14" fill="none" stroke={`url(#${id}-g)`} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="21.8" r="3.4" fill="#22e3ff" opacity="0.55" filter={`url(#${id}-f)`} />
      <circle cx="20" cy="21.8" r="2" fill="#bdf6ff" />
    </svg>
  )
}

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark />
      <span className="font-display text-[1.15rem] font-semibold tracking-tight text-white">
        {brand.name}
        <span className="text-neon-cyan">.</span>
      </span>
    </span>
  )
}

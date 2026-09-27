type SocialId = 'linkedin' | 'x' | 'github' | 'youtube'

/** Minimal stroke-style social glyphs (drawn in-house to match the icon set). */
export function SocialIcon({ id, className = 'h-4.5 w-4.5' }: { id: SocialId; className?: string }) {
  const common = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  }
  switch (id) {
    case 'linkedin':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3.5" />
          <path d="M7.5 10.5v6M7.5 7.5v.01M11 16.5v-6M11 13.2c0-1.6 1.2-2.7 2.6-2.7s2.4 1 2.4 2.6v3.4" />
        </svg>
      )
    case 'x':
      return (
        <svg {...common}>
          <path d="M4 4l6.8 9.1L4.5 20M20 4l-6.6 7.4M9 4H4.5l10.4 16H19.5z" />
        </svg>
      )
    case 'github':
      return (
        <svg {...common}>
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
          <path d="M9 18c-4.51 2-5-2-7-2" />
        </svg>
      )
    case 'youtube':
      return (
        <svg {...common}>
          <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
          <path d="m10 15 5-3-5-3z" />
        </svg>
      )
  }
}

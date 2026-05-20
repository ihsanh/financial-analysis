export default function Logo({ size = 38 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fa-bg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#0d3b7a" />
        </linearGradient>
        <linearGradient id="fa-bar" x1="0" y1="0" x2="0" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38d9f5" />
          <stop offset="100%" stopColor="#0266cc" />
        </linearGradient>
        <linearGradient id="fa-lens" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38d9f5" />
          <stop offset="100%" stopColor="#00aaff" />
        </linearGradient>
        <filter id="fa-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Hexagonal background */}
      <polygon
        points="22,1.5 40,11.5 40,31.5 22,41.5 4,31.5 4,11.5"
        fill="url(#fa-bg)"
        stroke="#1a4a9e"
        strokeWidth="0.6"
      />

      {/* Depth / shadow bars */}
      <rect x="8.5"  y="30" width="4" height="8"  rx="0.8" fill="#1565c0" opacity="0.25"/>
      <rect x="14.5" y="24" width="4" height="14" rx="0.8" fill="#1565c0" opacity="0.25"/>
      <rect x="20.5" y="19" width="4" height="19" rx="0.8" fill="#1565c0" opacity="0.25"/>

      {/* Main bars (bar chart rising from bottom) */}
      <rect x="9"  y="31" width="3.5" height="7"  rx="0.7" fill="url(#fa-bar)" />
      <rect x="15" y="25" width="3.5" height="13" rx="0.7" fill="url(#fa-bar)" />
      <rect x="21" y="20" width="3.5" height="18" rx="0.7" fill="url(#fa-bar)" />

      {/* Trend line (gold) */}
      <polyline
        points="10.75,31 16.75,25 22.75,20"
        fill="none"
        stroke="#ffc107"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#fa-glow)"
      />
      <circle cx="10.75" cy="31"  r="1.2" fill="#ffc107" />
      <circle cx="16.75" cy="25"  r="1.2" fill="#ffc107" />
      <circle cx="22.75" cy="20"  r="1.5" fill="#ffd740" filter="url(#fa-glow)"/>

      {/* Magnifying glass (analysis / depth) */}
      <circle
        cx="32" cy="14" r="6"
        fill="none"
        stroke="url(#fa-lens)"
        strokeWidth="1.6"
        filter="url(#fa-glow)"
      />
      {/* Inner lens reflection */}
      <circle cx="30.2" cy="12.2" r="1.6" fill="none" stroke="#38d9f5" strokeWidth="0.7" opacity="0.5"/>
      {/* Handle */}
      <line
        x1="36.2" y1="18.2" x2="38.8" y2="20.8"
        stroke="url(#fa-lens)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Small data points above bars to suggest "deep data" */}
      <circle cx="10.75" cy="28" r="0.7" fill="#38d9f5" opacity="0.6"/>
      <circle cx="16.75" cy="22" r="0.7" fill="#38d9f5" opacity="0.6"/>
      <circle cx="22.75" cy="17" r="0.7" fill="#38d9f5" opacity="0.6"/>
    </svg>
  )
}

/** The Flowvault lock mark. Same drawing as app/icon.svg. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" role="img" aria-label="Flowvault" style={{ flex: "none", display: "block" }}>
      <defs>
        <linearGradient id="fv-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#141614" /><stop offset="1" stopColor="#2b2f2b" /></linearGradient>
        <radialGradient id="fv-spark" cx="1" cy="0" r="0.8"><stop offset="0.22" stopColor="#f5a524" /><stop offset="0.62" stopColor="#f5a524" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="512" height="512" rx="112" fill="url(#fv-bg)" />
      <rect width="512" height="512" rx="112" fill="url(#fv-spark)" />
      <path d="M184 232v-52a72 72 0 0 1 144 0v52" fill="none" stroke="#f7f7f5" strokeWidth="40" strokeLinecap="round" />
      <rect x="128" y="216" width="256" height="184" rx="40" fill="#f7f7f5" />
      <circle cx="256" cy="294" r="24" fill="#141614" />
      <rect x="245" y="302" width="22" height="50" rx="11" fill="#141614" />
    </svg>
  );
}

/** Lock mark plus the word "Flowvault". */
export function Wordmark({ size = 32 }: { size?: number }) {
  return (
    <span className="row" style={{ gap: 10 }}>
      <Logo size={size} />
      <span style={{ fontFamily: "var(--display)", fontSize: size * 0.85, lineHeight: 1 }}>Flowvault</span>
    </span>
  );
}

/**
 * ACTTOLOG logo system (spec §11) — ported from the prototype `logoSVG()`.
 * Circular geometric “A” mark · cyan→violet gradient · restrained magenta node.
 * Variants: icon · horizontal · compact · monochrome.
 */

type Variant = 'icon' | 'horizontal' | 'compact';

export function Logo({ variant = 'icon', width = 34, mono = false, tagline = false, className }: {
  variant?: Variant; width?: number; mono?: boolean; tagline?: boolean; className?: string;
}) {
  const gid = `lg-${variant}${mono ? '-m' : ''}`;
  const a = mono ? '#ffffff' : '#35e0ff';
  const b = mono ? '#ffffff' : '#7c5cff';
  const c = mono ? '#ffffff' : '#ff4ecd';
  const stroke = mono ? '#ffffff' : `url(#${gid})`;

  const icon = (
    <g transform="translate(6,0) scale(.92)">
      <circle cx="32" cy="32" r="27" fill="none" stroke={stroke} strokeWidth={2.6} opacity={mono ? 0.9 : 0.55} />
      <path d="M20.5 45 L32 17 L43.5 45 M25.8 37.2 H38.2" fill="none" stroke={stroke}
        strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50.5" cy="19" r="3.2" fill={c} />
    </g>
  );

  if (variant === 'icon') {
    return (
      <svg viewBox="0 0 64 64" width={width} height={width} className={className} role="img" aria-label="Acttolog">
        {!mono && (
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} />
            </linearGradient>
          </defs>
        )}
        <circle cx="32" cy="32" r="27" fill="none" stroke={stroke} strokeWidth={2.6} opacity={mono ? 0.9 : 0.55} />
        <path d="M20.5 45 L32 17 L43.5 45 M25.8 37.2 H38.2" fill="none" stroke={stroke}
          strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="50.5" cy="19" r="3.2" fill={c} />
      </svg>
    );
  }

  const vbW = variant === 'horizontal' ? 330 : 240;
  const height = Math.round((width * 64) / vbW);
  const showTag = variant === 'horizontal' && tagline;

  return (
    <svg viewBox={`0 0 ${vbW} 64`} width={width} height={height} className={className} role="img" aria-label="Acttolog">
      {!mono && (
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} />
          </linearGradient>
        </defs>
      )}
      {icon}
      <text x={variant === 'horizontal' ? 76 : 66} y={variant === 'horizontal' ? 40 : 39}
        fontFamily="'Space Grotesk',sans-serif" fontSize={variant === 'horizontal' ? 25 : 22}
        fontWeight={700} letterSpacing="4" fill={mono ? '#ffffff' : 'currentColor'}>ACTTOLOG</text>
      {showTag && (
        <text x="77" y="56" fontFamily="'JetBrains Mono',monospace" fontSize={7.6}
          letterSpacing="3.2" fill={mono ? '#ffffff' : '#93a0c4'}>WELCOME TO ACTTOLOG WORLD</text>
      )}
    </svg>
  );
}

/**
 * رسم توضيحي رمضاني مضمّن (SVG) — لا يعتمد على أي ملفات صور خارجية،
 * فيظهر دائمًا على أي استضافة ويُطبع ويُصدَّر إلى PDF بلا مشاكل.
 */

const STARS: Array<[number, number, number]> = [
  [70, 70, 1],
  [140, 40, 0.8],
  [230, 90, 0.7],
  [330, 45, 1],
  [420, 110, 0.6],
  [470, 50, 0.9],
  [650, 70, 0.8],
  [705, 150, 0.7],
  [745, 50, 1],
  [60, 190, 0.6],
  [740, 250, 0.7],
  [40, 300, 0.8],
];

function Star({ x, y, s, delay }: { x: number; y: number; s: number; delay: number }) {
  const r = 9 * s;
  const d = `M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`;
  return (
    <path d={d} fill="#d4a017">
      <animate attributeName="opacity" values="0.35;1;0.35" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
    </path>
  );
}

function Lantern({ x, top, body, glass }: { x: number; top: number; body: string; glass: string }) {
  const y = top;
  return (
    <g>
      <line x1={x} y1={0} x2={x} y2={y} stroke="#b8860b" strokeWidth="3" />
      <circle cx={x} cy={y} r="5" fill="#d4a017" />
      <rect x={x - 16} y={y + 4} width="32" height="12" rx="4" fill="#d4a017" />
      <path d={`M${x - 28} ${y + 16} H${x + 28} L${x + 22} ${y + 96} H${x - 22} Z`} fill={body} />
      <rect x={x - 9} y={y + 28} width="18" height="56" rx="9" fill={glass} opacity="0.9" />
      <rect x={x - 23} y={y + 28} width="9" height="52" rx="4.5" fill={glass} opacity="0.5" />
      <rect x={x + 14} y={y + 28} width="9" height="52" rx="4.5" fill={glass} opacity="0.5" />
      <path d={`M${x - 5} ${y + 50} l5 -8 5 8 -5 8 z`} fill="#fff7d6" opacity="0.9" />
      <rect x={x - 18} y={y + 96} width="36" height="12" rx="4" fill="#d4a017" />
      <path
        d={`M${x - 9} ${y + 108} v16 M${x} ${y + 108} v22 M${x + 9} ${y + 108} v16`}
        stroke="#d4a017"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
  );
}

function SunRays({ cx, cy, color }: { cx: number; cy: number; color: string }) {
  return (
    <g stroke={color} strokeWidth="4" strokeLinecap="round">
      {[-70, -40, -10, 20, 50].map((deg) => {
        const rad = ((deg - 90) * Math.PI) / 180;
        const r1 = 40;
        const r2 = 54;
        return (
          <line
            key={deg}
            x1={(cx + r1 * Math.cos(rad)).toFixed(1)}
            y1={(cy + r1 * Math.sin(rad)).toFixed(1)}
            x2={(cx + r2 * Math.cos(rad)).toFixed(1)}
            y2={(cy + r2 * Math.sin(rad)).toFixed(1)}
          />
        );
      })}
    </g>
  );
}

export default function HeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 560"
      className={className}
      role="img"
      aria-label="رسم توضيحي لرمضان: هلال وفوانيس ومسجد ومسار الشمس من الفجر إلى المغرب"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="h-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="100%" stopColor="#ffeec4" />
        </linearGradient>
        <linearGradient id="h-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd56a" />
          <stop offset="100%" stopColor="#d4a017" />
        </linearGradient>
        <linearGradient id="h-green" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3aa390" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="h-deep" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14897b" />
          <stop offset="100%" stopColor="#0b4f3f" />
        </linearGradient>
        <linearGradient id="h-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a5b" />
          <stop offset="100%" stopColor="#e4572e" />
        </linearGradient>
        <radialGradient id="h-sun">
          <stop offset="0%" stopColor="#ffe27a" />
          <stop offset="100%" stopColor="#f6b73c" />
        </radialGradient>
        <radialGradient id="h-sunset">
          <stop offset="0%" stopColor="#ffb36b" />
          <stop offset="100%" stopColor="#f0783c" />
        </radialGradient>
      </defs>

      {/* الخلفية */}
      <rect width="800" height="560" rx="40" fill="url(#h-sky)" />

      {/* النجوم */}
      {STARS.map(([x, y, s], i) => (
        <Star key={i} x={x} y={y} s={s} delay={(i % 5) * 0.5} />
      ))}

      {/* الهلال */}
      <path d="M560 46 A84 84 0 1 0 560 214 A90 90 0 0 1 560 46 Z" fill="url(#h-gold)" />
      <path d="M600 72 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 z" fill="#d4a017" opacity="0.9" />

      {/* الفوانيس */}
      <Lantern x={110} top={70} body="url(#h-green)" glass="#9fe7d6" />
      <Lantern x={205} top={30} body="url(#h-gold)" glass="#fff1b8" />
      <Lantern x={300} top={95} body="url(#h-red)" glass="#ffd0bd" />
      <Lantern x={700} top={210} body="url(#h-green)" glass="#9fe7d6" />

      {/* ظل الأرض */}
      <ellipse cx="400" cy="500" rx="270" ry="16" fill="#0b4f3f" opacity="0.08" />

      {/* المآذن */}
      <rect x="232" y="268" width="48" height="212" rx="10" fill="url(#h-green)" />
      <rect x="520" y="268" width="48" height="212" rx="10" fill="url(#h-green)" />
      <path d="M226 272 A30 30 0 0 1 286 272 Z" fill="url(#h-deep)" />
      <path d="M514 272 A30 30 0 0 1 574 272 Z" fill="url(#h-deep)" />
      <circle cx="256" cy="238" r="5" fill="#d4a017" />
      <circle cx="544" cy="238" r="5" fill="#d4a017" />
      <rect x="248" y="330" width="16" height="30" rx="8" fill="#ffe9a8" />
      <rect x="536" y="330" width="16" height="30" rx="8" fill="#ffe9a8" />

      {/* جسم المسجد */}
      <rect x="280" y="340" width="240" height="140" rx="14" fill="url(#h-green)" />
      <rect x="296" y="328" width="208" height="16" rx="6" fill="#d4a017" />

      {/* القبة الكبيرة */}
      <path d="M296 332 A104 104 0 0 1 504 332 Z" fill="url(#h-gold)" />
      <path d="M330 300 Q400 240 470 300" stroke="#fff3c4" strokeWidth="8" fill="none" strokeLinecap="round" opacity="0.6" />
      <line x1="400" y1="214" x2="400" y2="232" stroke="#b8860b" strokeWidth="4" />
      <path d="M400 194 A11 11 0 1 0 400 216 A12 12 0 0 1 400 194 Z" fill="#d4a017" />

      {/* الباب والنوافذ */}
      <path d="M370 480 V426 A30 30 0 0 1 430 426 V480 Z" fill="#b8860b" />
      <path d="M378 480 V430 A22 22 0 0 1 422 430 V480 Z" fill="#e9b949" />
      <line x1="400" y1="432" x2="400" y2="480" stroke="#b8860b" strokeWidth="3" />
      <path d="M312 440 V412 A16 16 0 0 1 344 412 V440 Z" fill="#ffe9a8" />
      <path d="M456 440 V412 A16 16 0 0 1 488 412 V440 Z" fill="#ffe9a8" />

      {/* شجيرات */}
      <ellipse cx="200" cy="482" rx="46" ry="22" fill="#2a9d8f" />
      <ellipse cx="160" cy="488" rx="30" ry="16" fill="#3fb39f" />
      <ellipse cx="600" cy="482" rx="46" ry="22" fill="#2a9d8f" />
      <ellipse cx="640" cy="488" rx="30" ry="16" fill="#3fb39f" />

      {/* قوس الشمس: الفجر (يمين) ← المغرب (يسار) */}
      <path d="M96 538 Q400 484 704 538" stroke="url(#h-gold)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <SunRays cx={704} cy={540} color="#f6b73c" />
      <path d="M672 540 A32 32 0 0 1 736 540 Z" fill="url(#h-sun)" />
      <SunRays cx={96} cy={540} color="#f0783c" />
      <path d="M64 540 A32 32 0 0 1 128 540 Z" fill="url(#h-sunset)" />

      {/* ساعة صغيرة */}
      <circle cx="400" cy="516" r="22" fill="#fff7e0" stroke="#d4a017" strokeWidth="4" />
      <line x1="400" y1="516" x2="400" y2="502" stroke="#0b4f3f" strokeWidth="3" strokeLinecap="round" />
      <line x1="400" y1="516" x2="410" y2="522" stroke="#0b4f3f" strokeWidth="3" strokeLinecap="round" />
      <circle cx="400" cy="516" r="2.5" fill="#0b4f3f" />
    </svg>
  );
}

/** زخرفة هندسية إسلامية خفيفة لخلفية الشهادة (SVG مضمّن) */
export function CertificatePattern() {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="cert-geo" width="64" height="64" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#d4a017" strokeOpacity="0.28" strokeWidth="1.2">
            <rect x="16" y="16" width="32" height="32" />
            <rect x="16" y="16" width="32" height="32" transform="rotate(45 32 32)" />
            <circle cx="32" cy="32" r="6" />
            <circle cx="0" cy="0" r="4" />
            <circle cx="64" cy="0" r="4" />
            <circle cx="0" cy="64" r="4" />
            <circle cx="64" cy="64" r="4" />
          </g>
        </pattern>
        <radialGradient id="cert-glow" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#fff3d1" stopOpacity="0.2" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#cert-geo)" />
      <rect width="100%" height="100%" fill="url(#cert-glow)" />
    </svg>
  );
}

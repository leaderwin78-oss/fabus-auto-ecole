// Hand-drawn SVG scenes rather than bitmaps: they stay sharp at any size, adapt
// to the light/dark palette through currentColor and CSS variables, add nothing
// to network load, and carry no licensing question. Every scene draws from the
// same brand palette so the set reads as one family.
//
// To replace any of these with a real photograph later, swap the component body
// for an <Image> — the call sites only ever render <XxxIllustration />.

const GREEN = "var(--fabus-green)";
const SOFT = "var(--fabus-green-soft)";
const LINE = "var(--border-color)";
const SURFACE = "var(--bg-secondary)";

function Road({ y = 150 }: { y?: number }) {
  return (
    <>
      <rect x="0" y={y} width="400" height="46" fill={SURFACE} />
      <line x1="0" y1={y} x2="400" y2={y} stroke={LINE} strokeWidth="2" />
      <line
        x1="10"
        y1={y + 23}
        x2="390"
        y2={y + 23}
        stroke={GREEN}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="26 20"
        opacity="0.5"
      />
    </>
  );
}

// A small three-quarter car used across several scenes.
function Car({ x = 0, y = 0, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d="M6 34 C6 24 14 20 24 19 L36 8 C39 5 43 4 47 4 L82 4 C87 4 91 6 94 10 L104 19 C114 20 121 24 121 34 L121 42 C121 45 119 47 116 47 L11 47 C8 47 6 45 6 42 Z"
        fill={GREEN}
      />
      <path d="M40 12 L60 12 L60 21 L32 21 Z" fill="var(--bg-primary)" opacity="0.9" />
      <path d="M66 12 L84 12 C86 12 88 13 89 15 L94 21 L66 21 Z" fill="var(--bg-primary)" opacity="0.9" />
      <circle cx="32" cy="47" r="10" fill="var(--text-primary)" />
      <circle cx="32" cy="47" r="4.5" fill="var(--bg-primary)" />
      <circle cx="96" cy="47" r="10" fill="var(--text-primary)" />
      <circle cx="96" cy="47" r="4.5" fill="var(--bg-primary)" />
      <rect x="112" y="26" width="9" height="6" rx="3" fill="#fdd663" />
    </g>
  );
}

export function HeroIllustration() {
  return (
    <svg viewBox="0 0 400 220" role="img" aria-label="Une voiture d'auto-école sur la route, entourée de panneaux de signalisation" className="illus">
      <circle cx="330" cy="46" r="30" fill={SOFT} />
      <path d="M40 128 q22 -30 44 0 z" fill={SOFT} />
      <path d="M96 128 q16 -22 32 0 z" fill={SOFT} />

      {/* panneau de limitation */}
      <line x1="270" y1="150" x2="270" y2="104" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
      <circle cx="270" cy="90" r="22" fill="var(--bg-primary)" stroke="#d93025" strokeWidth="5" />
      <text x="270" y="97" textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--text-primary)" fontFamily="var(--font-display)">50</text>

      {/* feu tricolore */}
      <line x1="332" y1="150" x2="332" y2="112" stroke={LINE} strokeWidth="4" strokeLinecap="round" />
      <rect x="320" y="58" width="24" height="56" rx="8" fill="var(--text-primary)" />
      <circle cx="332" cy="72" r="6" fill="#d93025" opacity="0.25" />
      <circle cx="332" cy="88" r="6" fill="#fdd663" opacity="0.25" />
      <circle cx="332" cy="104" r="6" fill={GREEN} />

      <Road y={150} />
      <Car x={62} y={101} scale={1.05} />
    </svg>
  );
}

export function WaitingIllustration() {
  return (
    <svg viewBox="0 0 400 220" role="img" aria-label="Un dossier en cours de vérification" className="illus">
      <ellipse cx="200" cy="196" rx="120" ry="12" fill={SOFT} />

      {/* dossier */}
      <rect x="118" y="44" width="164" height="132" rx="12" fill="var(--bg-primary)" stroke={LINE} strokeWidth="2" />
      <rect x="118" y="44" width="164" height="30" rx="12" fill={SOFT} />
      <rect x="118" y="62" width="164" height="12" fill={SOFT} />
      <rect x="142" y="94" width="90" height="7" rx="3.5" fill={LINE} />
      <rect x="142" y="112" width="116" height="7" rx="3.5" fill={LINE} />
      <rect x="142" y="130" width="70" height="7" rx="3.5" fill={LINE} />
      <rect x="142" y="148" width="100" height="7" rx="3.5" fill={LINE} />

      {/* sablier */}
      <circle cx="286" cy="146" r="38" fill={GREEN} />
      <path d="M272 130 L300 130 L300 134 L290 146 L300 158 L300 162 L272 162 L272 158 L282 146 L272 134 Z" fill="var(--bg-primary)" />
      <path d="M276 156 L296 156 L290 148 L282 148 Z" fill={GREEN} opacity="0.55" />

      {/* etoiles d'attente */}
      <circle cx="96" cy="70" r="5" fill={GREEN} opacity="0.35" />
      <circle cx="112" cy="188" r="7" fill={GREEN} opacity="0.2" />
      <circle cx="318" cy="60" r="6" fill={GREEN} opacity="0.3" />
    </svg>
  );
}

export function RejectedIllustration() {
  return (
    <svg viewBox="0 0 400 220" role="img" aria-label="Un dossier non retenu" className="illus">
      <ellipse cx="200" cy="196" rx="120" ry="12" fill="rgba(217,48,37,0.10)" />
      <rect x="118" y="44" width="164" height="132" rx="12" fill="var(--bg-primary)" stroke={LINE} strokeWidth="2" />
      <rect x="118" y="44" width="164" height="30" rx="12" fill="rgba(217,48,37,0.12)" />
      <rect x="118" y="62" width="164" height="12" fill="rgba(217,48,37,0.12)" />
      <rect x="142" y="98" width="100" height="7" rx="3.5" fill={LINE} />
      <rect x="142" y="116" width="116" height="7" rx="3.5" fill={LINE} />
      <rect x="142" y="134" width="76" height="7" rx="3.5" fill={LINE} />
      <circle cx="286" cy="146" r="38" fill="var(--danger)" />
      <path d="M273 133 L299 159 M299 133 L273 159" stroke="var(--bg-primary)" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}

export function SignupStudentIllustration() {
  return (
    <svg viewBox="0 0 400 220" role="img" aria-label="Une élève révise le code de la route sur son téléphone" className="illus">
      <ellipse cx="200" cy="198" rx="118" ry="12" fill={SOFT} />
      {/* telephone */}
      <rect x="150" y="34" width="100" height="160" rx="16" fill="var(--bg-primary)" stroke={LINE} strokeWidth="2.5" />
      <rect x="150" y="34" width="100" height="34" rx="16" fill={GREEN} />
      <rect x="150" y="56" width="100" height="12" fill={GREEN} />
      <rect x="184" y="42" width="32" height="5" rx="2.5" fill="var(--bg-primary)" opacity="0.7" />
      {/* question de code */}
      <circle cx="200" cy="100" r="20" fill="var(--bg-primary)" stroke="#d93025" strokeWidth="4" />
      <rect x="192" y="90" width="16" height="4" rx="2" fill="var(--text-primary)" />
      <rect x="166" y="134" width="68" height="8" rx="4" fill={SOFT} />
      <rect x="166" y="152" width="52" height="8" rx="4" fill={SOFT} />
      <rect x="166" y="170" width="68" height="12" rx="6" fill={GREEN} />
      {/* validation */}
      <circle cx="272" cy="150" r="26" fill={GREEN} />
      <path d="M261 150 l8 9 l14 -18" stroke="var(--bg-primary)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="118" cy="82" r="18" fill={SOFT} />
      <path d="M110 82 l6 6 l11 -13" stroke={GREEN} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function SignupSchoolIllustration() {
  return (
    <svg viewBox="0 0 400 220" role="img" aria-label="Le bâtiment d'une auto-école avec ses véhicules" className="illus">
      <ellipse cx="200" cy="198" rx="130" ry="12" fill={SOFT} />
      {/* batiment */}
      <rect x="112" y="52" width="176" height="126" rx="10" fill="var(--bg-primary)" stroke={LINE} strokeWidth="2.5" />
      <path d="M104 54 L200 18 L296 54 Z" fill={GREEN} />
      <rect x="180" y="126" width="40" height="52" rx="5" fill={SOFT} />
      {[136, 180, 224].map((x) => (
        <rect key={x} x={x} y="76" width="40" height="32" rx="5" fill={SOFT} />
      ))}
      <rect x="136" y="126" width="34" height="30" rx="5" fill={SOFT} />
      <rect x="230" y="126" width="34" height="30" rx="5" fill={SOFT} />
      {/* enseigne */}
      <rect x="160" y="34" width="80" height="16" rx="8" fill="var(--bg-primary)" stroke={GREEN} strokeWidth="2.5" />
      <text x="200" y="46" textAnchor="middle" fontSize="10" fontWeight="600" fill={GREEN} fontFamily="var(--font-display)">AUTO-ÉCOLE</text>
      <Car x={296} y={130} scale={0.5} />
    </svg>
  );
}

export function SignupInstructorIllustration() {
  return (
    <svg viewBox="0 0 400 220" role="img" aria-label="Un moniteur accompagne un élève au volant" className="illus">
      <ellipse cx="200" cy="198" rx="126" ry="12" fill={SOFT} />
      {/* volant */}
      <circle cx="128" cy="112" r="52" fill="none" stroke={GREEN} strokeWidth="12" />
      <circle cx="128" cy="112" r="15" fill={GREEN} />
      <line x1="128" y1="97" x2="128" y2="62" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
      <line x1="115" y1="121" x2="86" y2="146" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
      <line x1="141" y1="121" x2="170" y2="146" stroke={GREEN} strokeWidth="11" strokeLinecap="round" />
      {/* moniteur */}
      <circle cx="272" cy="74" r="24" fill={SOFT} />
      <circle cx="272" cy="74" r="24" fill="none" stroke={GREEN} strokeWidth="2.5" />
      <circle cx="272" cy="67" r="9" fill={GREEN} />
      <path d="M256 88 q16 -13 32 0 z" fill={GREEN} />
      <rect x="238" y="112" width="68" height="9" rx="4.5" fill={LINE} />
      <rect x="238" y="130" width="52" height="9" rx="4.5" fill={LINE} />
      {/* badge agrement */}
      <circle cx="296" cy="156" r="21" fill={GREEN} />
      <path d="M286 156 l7 8 l13 -16" stroke="var(--bg-primary)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

// Compact scenes for the top of each dashboard.
export function DashboardIllustration({ variant }: { variant: "student" | "instructor" | "admin" | "super_admin" }) {
  const label = {
    student: "Progression de l'élève vers le permis",
    instructor: "Planning des séances de conduite",
    admin: "Gestion de l'auto-école",
    super_admin: "Vue d'ensemble de la plateforme",
  }[variant];

  return (
    <svg viewBox="0 0 320 120" role="img" aria-label={label} className="illus-banner">
      <Road y={86} />
      {variant === "student" && (
        <>
          <Car x={26} y={44} scale={0.72} />
          <line x1="240" y1="86" x2="240" y2="46" stroke={LINE} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M240 20 L282 32 L240 44 Z" fill={GREEN} />
        </>
      )}
      {variant === "instructor" && (
        <>
          <Car x={126} y={44} scale={0.72} />
          <circle cx="52" cy="44" r="20" fill={SOFT} />
          <path d="M52 32 v12 l8 6" stroke={GREEN} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </>
      )}
      {variant === "admin" && (
        <>
          <rect x="34" y="26" width="86" height="60" rx="7" fill="var(--bg-primary)" stroke={LINE} strokeWidth="2" />
          <path d="M28 28 L77 8 L126 28 Z" fill={GREEN} />
          <rect x="48" y="42" width="20" height="16" rx="3" fill={SOFT} />
          <rect x="86" y="42" width="20" height="16" rx="3" fill={SOFT} />
          <rect x="66" y="66" width="22" height="20" rx="3" fill={SOFT} />
          <Car x={168} y={44} scale={0.72} />
        </>
      )}
      {variant === "super_admin" && (
        <>
          {[40, 120, 200].map((x, i) => (
            <g key={x}>
              <rect x={x} y={86 - (30 + i * 16)} width="46" height={30 + i * 16} rx="5" fill={i === 2 ? GREEN : SOFT} />
            </g>
          ))}
          <circle cx="282" cy="34" r="18" fill={SOFT} />
          <path d="M274 34 l6 6 l11 -13" stroke={GREEN} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </>
      )}
    </svg>
  );
}

export function EmptyStateIllustration() {
  return (
    <svg viewBox="0 0 200 120" role="img" aria-label="Aucun élément à afficher" className="illus-empty">
      <ellipse cx="100" cy="104" rx="56" ry="7" fill={SOFT} />
      <rect x="58" y="24" width="84" height="70" rx="8" fill="var(--bg-primary)" stroke={LINE} strokeWidth="2" />
      <rect x="58" y="24" width="84" height="18" rx="8" fill={SOFT} />
      <rect x="58" y="34" width="84" height="8" fill={SOFT} />
      <rect x="72" y="56" width="42" height="6" rx="3" fill={LINE} />
      <rect x="72" y="70" width="56" height="6" rx="3" fill={LINE} />
    </svg>
  );
}

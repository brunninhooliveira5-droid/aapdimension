/* ══════════════════════════════════════════════════════════
   BIBLIOTECA DE ILUSTRAÇÕES TÉCNICAS — Mapeamento Z
   Pictogramas técnicos industriais para auxílio visual
   ══════════════════════════════════════════════════════════ */

/* ── 1. Altura Segura (Safe Z) ────────────────────────── */
export function IllustrationSafeHeight() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Table / base */}
      <rect x="10" y="80" width="160" height="8" rx="1" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.8" />
      {/* Workpiece */}
      <rect x="30" y="62" width="100" height="18" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="80" y="74" textAnchor="middle" className="fill-muted-foreground" fontSize="7">Peça</text>
      {/* Tool / spindle */}
      <rect x="76" y="8" width="18" height="26" rx="2" fill="hsl(var(--primary))" opacity="0.7" />
      <polygon points="80,34 90,34 85,44" fill="hsl(var(--primary))" />
      {/* Safe height arrow */}
      <line x1="115" y1="8" x2="115" y2="62" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="111" y1="8" x2="119" y2="8" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="111" y1="62" x2="119" y2="62" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="138" y="32" className="fill-primary" fontSize="7" fontWeight="bold">Altura</text>
      <text x="138" y="42" className="fill-primary" fontSize="7" fontWeight="bold">segura</text>
      {/* Movement path dotted */}
      <path d="M85,8 L85,8 L145,8" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
      <polygon points="143,6 147,8 143,10" fill="hsl(var(--primary))" opacity="0.5" />
    </svg>
  );
}

/* ── 2. Distância entre pontos em X ───────────────────── */
export function IllustrationSpacingX() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Grid lines */}
      {[25, 55, 85, 115, 145].map((x) => (
        <line key={x} x1={x} y1="10" x2={x} y2="80" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="15" y1={y} x2="155" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {/* Points */}
      {[25, 55, 85, 115, 145].map((x) =>
        [20, 40, 60, 80].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="hsl(var(--primary))" opacity="0.6" />
        ))
      )}
      {/* Spacing arrows */}
      <defs>
        <marker id="arrowHX" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill="hsl(var(--primary))" />
        </marker>
      </defs>
      <line x1="25" y1="95" x2="55" y2="95" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrowHX)" />
      <line x1="55" y1="95" x2="25" y2="95" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrowHX)" />
      <text x="40" y="106" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">Dist. X</text>
    </svg>
  );
}

/* ── 3. Distância entre pontos em Y ───────────────────── */
export function IllustrationSpacingY() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {[25, 55, 85, 115, 145].map((x) => (
        <line key={x} x1={x} y1="10" x2={x} y2="80" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {[20, 40, 60, 80].map((y) => (
        <line key={y} x1="15" y1={y} x2="155" y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      ))}
      {[25, 55, 85, 115, 145].map((x) =>
        [20, 40, 60, 80].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill="hsl(var(--primary))" opacity="0.6" />
        ))
      )}
      {/* Vertical spacing arrow */}
      <line x1="167" y1="20" x2="167" y2="40" stroke="hsl(var(--primary))" strokeWidth="1.5" />
      <line x1="163" y1="20" x2="171" y2="20" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="163" y1="40" x2="171" y2="40" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="167" y="55" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">Dist. Y</text>
    </svg>
  );
}

/* ── 4. Velocidade do toque ───────────────────────────── */
export function IllustrationProbeFeed() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Workpiece left */}
      <rect x="5" y="68" width="70" height="14" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.8" />
      {/* Workpiece right */}
      <rect x="100" y="68" width="70" height="14" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.8" />
      {/* Slow probe */}
      <rect x="32" y="18" width="14" height="22" rx="1" fill="hsl(var(--primary))" opacity="0.5" />
      <polygon points="35,40 43,40 39,50" fill="hsl(var(--primary))" opacity="0.5" />
      <line x1="39" y1="50" x2="39" y2="68" stroke="hsl(var(--primary))" strokeWidth="0.8" strokeDasharray="2,1" />
      <text x="39" y="12" textAnchor="middle" className="fill-muted-foreground" fontSize="6">Lento</text>
      {/* Slow — small arrows (gentle descent) */}
      <polygon points="48,50 50,46 52,50" fill="hsl(var(--primary))" opacity="0.4" />
      <polygon points="48,56 50,52 52,56" fill="hsl(var(--primary))" opacity="0.3" />
      <text x="39" y="98" textAnchor="middle" fontSize="6" className="fill-primary" fontWeight="bold">+ Preciso</text>
      {/* Fast probe */}
      <rect x="127" y="18" width="14" height="22" rx="1" fill="hsl(var(--primary))" opacity="0.8" />
      <polygon points="130,40 138,40 134,50" fill="hsl(var(--primary))" opacity="0.8" />
      <line x1="134" y1="50" x2="134" y2="68" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeDasharray="4,1" />
      <text x="134" y="12" textAnchor="middle" className="fill-muted-foreground" fontSize="6">Rápido</text>
      {/* Fast — large arrows (fast descent) */}
      <polygon points="143,42 147,34 151,42" fill="hsl(var(--primary))" opacity="0.6" />
      <text x="134" y="98" textAnchor="middle" fontSize="6" className="fill-muted-foreground" fontWeight="bold">+ Rápido</text>
    </svg>
  );
}

/* ── 5. Profundidade máxima do probe ──────────────────── */
export function IllustrationProbeDepth() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Surface */}
      <rect x="15" y="50" width="150" height="16" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1" />
      <text x="90" y="61" textAnchor="middle" className="fill-muted-foreground" fontSize="7">Peça</text>
      {/* Tool descending */}
      <rect x="80" y="8" width="16" height="22" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
      <polygon points="83,30 93,30 88,40" fill="hsl(var(--primary))" opacity="0.6" />
      {/* Depth limit line */}
      <line x1="15" y1="90" x2="165" y2="90" stroke="hsl(var(--destructive))" strokeWidth="1" strokeDasharray="4,2" opacity="0.6" />
      <text x="90" y="102" textAnchor="middle" className="fill-destructive" fontSize="6" fontWeight="bold">Limite máximo</text>
      {/* Depth arrow */}
      <line x1="55" y1="40" x2="55" y2="90" stroke="hsl(var(--destructive))" strokeWidth="1" strokeDasharray="2,1" />
      <line x1="51" y1="40" x2="59" y2="40" stroke="hsl(var(--destructive))" strokeWidth="1" />
      <line x1="51" y1="90" x2="59" y2="90" stroke="hsl(var(--destructive))" strokeWidth="1" />
      <text x="42" y="68" textAnchor="end" className="fill-destructive" fontSize="6">Prof.</text>
      <text x="42" y="76" textAnchor="end" className="fill-destructive" fontSize="6">máx.</text>
    </svg>
  );
}

/* ── 6. Número de toques por ponto ────────────────────── */
export function IllustrationTouchPrecision() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Surface */}
      <rect x="5" y="60" width="170" height="10" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" />
      {/* 1 touch */}
      <circle cx="35" cy="55" r="3" fill="hsl(var(--primary))" opacity="0.4" />
      <line x1="35" y1="38" x2="35" y2="52" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4" />
      <text x="35" y="30" textAnchor="middle" className="fill-muted-foreground" fontSize="7">1×</text>
      <text x="35" y="82" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Rápido</text>
      {/* 2 touches */}
      <circle cx="90" cy="55" r="3" fill="hsl(var(--primary))" opacity="0.6" />
      <circle cx="90" cy="48" r="2" fill="hsl(var(--primary))" opacity="0.3" />
      <line x1="90" y1="32" x2="90" y2="52" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.5" />
      <text x="90" y="24" textAnchor="middle" className="fill-muted-foreground" fontSize="7">2×</text>
      <text x="90" y="82" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Normal</text>
      {/* 3 touches */}
      <circle cx="145" cy="55" r="3" fill="hsl(var(--primary))" opacity="0.8" />
      <circle cx="145" cy="48" r="2" fill="hsl(var(--primary))" opacity="0.4" />
      <circle cx="145" cy="41" r="2" fill="hsl(var(--primary))" opacity="0.2" />
      <line x1="145" y1="26" x2="145" y2="52" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.7" />
      <text x="145" y="18" textAnchor="middle" className="fill-muted-foreground" fontSize="7">3×</text>
      <text x="145" y="82" textAnchor="middle" className="fill-primary" fontSize="5" fontWeight="bold">Preciso</text>
    </svg>
  );
}

/* ── 7. Modo de mapeamento (comparação) ──────────────── */
export function IllustrationMappingUniform() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {[20, 44, 68, 92, 116, 140, 164].map((x) =>
        [12, 30, 48, 66, 84].map((y) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="hsl(var(--primary))" opacity="0.5" />
        ))
      )}
      {[12, 30, 48, 66, 84].map((y) => (
        <line key={y} x1="20" y1={y} x2="164" y2={y} stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.25" />
      ))}
      {[20, 44, 68, 92, 116, 140, 164].map((x) => (
        <line key={x} x1={x} y1="12" x2={x} y2="84" stroke="hsl(var(--primary))" strokeWidth="0.4" opacity="0.25" />
      ))}
    </svg>
  );
}

/* ── 7b. Mapeamento inteligente ───────────────────────── */
export function IllustrationMappingSmart() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Sparse area */}
      {[20, 55, 90].map((x) =>
        [15, 45, 75].map((y) => (
          <circle key={`s-${x}-${y}`} cx={x} cy={y} r="2" fill="hsl(var(--primary))" opacity="0.3" />
        ))
      )}
      {/* Dense area (detail zone) */}
      {[110, 122, 134, 146, 158].map((x) =>
        [10, 22, 34, 46, 58, 70, 82].map((y) => (
          <circle key={`d-${x}-${y}`} cx={x} cy={y} r="2" fill="hsl(var(--primary))" opacity="0.7" />
        ))
      )}
      <rect x="105" y="5" width="58" height="80" rx="3" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <text x="134" y="-1" textAnchor="middle" className="fill-primary" fontSize="6" fontWeight="bold">+ detalhes</text>
    </svg>
  );
}

/* ── 8. Deslocamento entre pontos (retração) ─────────── */
export function IllustrationRetraction() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Curved surface */}
      <path d="M10,65 Q50,35 90,55 Q130,75 170,45" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Fixed height line */}
      <line x1="25" y1="15" x2="155" y2="15" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="3,2" />
      <text x="90" y="10" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Padrão (fixo)</text>
      {/* Adaptive path */}
      <path d="M30,50 L30,28 L65,28 L65,40 L100,40 L100,25 L135,25 L135,38" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="2,1" />
      <text x="90" y="85" textAnchor="middle" className="fill-primary" fontSize="6" fontWeight="bold">Adaptativo</text>
      {/* Points on surface */}
      {[30, 65, 100, 135].map((x, i) => (
        <circle key={x} cx={x} cy={[52, 42, 56, 46][i]} r="2.5" fill="hsl(var(--primary))" />
      ))}
    </svg>
  );
}

/* ── 9. Probe personalizado ──────────────────────────── */
export function IllustrationProbeOffset() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Spindle */}
      <rect x="50" y="10" width="24" height="40" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <text x="62" y="58" textAnchor="middle" className="fill-muted-foreground" fontSize="6">Spindle</text>
      {/* Probe (offset to the side) */}
      <rect x="100" y="15" width="12" height="30" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
      <circle cx="106" cy="48" r="3" fill="hsl(var(--primary))" />
      <text x="106" y="62" textAnchor="middle" className="fill-primary" fontSize="6">Probe</text>
      {/* Offset X arrow */}
      <line x1="62" y1="72" x2="106" y2="72" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="62" y1="69" x2="62" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="106" y1="69" x2="106" y2="75" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="84" y="83" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">Offset X</text>
      {/* Workpiece */}
      <rect x="20" y="90" width="140" height="10" rx="2" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" />
    </svg>
  );
}

/* ── 10. Offset X do probe ───────────────────────────── */
export function IllustrationProbeOffsetX() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Top-down view */}
      <rect x="30" y="10" width="120" height="70" rx="3" fill="hsl(var(--muted))" opacity="0.3" stroke="hsl(var(--border))" strokeWidth="0.5" />
      <text x="90" y="80" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Peça (vista superior)</text>
      {/* Spindle center */}
      <circle cx="65" cy="45" r="10" fill="hsl(var(--muted-foreground))" opacity="0.3" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
      <circle cx="65" cy="45" r="2" fill="hsl(var(--muted-foreground))" />
      <text x="65" y="62" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Fresa</text>
      {/* Probe */}
      <circle cx="120" cy="45" r="5" fill="hsl(var(--primary))" opacity="0.6" stroke="hsl(var(--primary))" strokeWidth="1" />
      <circle cx="120" cy="45" r="1.5" fill="hsl(var(--primary))" />
      <text x="120" y="62" textAnchor="middle" className="fill-primary" fontSize="5">Probe</text>
      {/* Arrow */}
      <line x1="75" y1="45" x2="115" y2="45" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrOX)" />
      <defs>
        <marker id="arrOX" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill="hsl(var(--primary))" />
        </marker>
      </defs>
      <text x="95" y="38" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">X</text>
    </svg>
  );
}

/* ── 11. Offset Y do probe ───────────────────────────── */
export function IllustrationProbeOffsetY() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      <rect x="30" y="5" width="120" height="75" rx="3" fill="hsl(var(--muted))" opacity="0.3" stroke="hsl(var(--border))" strokeWidth="0.5" />
      <text x="90" y="85" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Vista superior</text>
      {/* Spindle */}
      <circle cx="90" cy="50" r="10" fill="hsl(var(--muted-foreground))" opacity="0.3" stroke="hsl(var(--muted-foreground))" strokeWidth="1" />
      <circle cx="90" cy="50" r="2" fill="hsl(var(--muted-foreground))" />
      <text x="90" y="66" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Fresa</text>
      {/* Probe */}
      <circle cx="90" cy="18" r="5" fill="hsl(var(--primary))" opacity="0.6" stroke="hsl(var(--primary))" strokeWidth="1" />
      <circle cx="90" cy="18" r="1.5" fill="hsl(var(--primary))" />
      <text x="105" y="20" className="fill-primary" fontSize="5">Probe</text>
      {/* Arrow */}
      <line x1="90" y1="40" x2="90" y2="23" stroke="hsl(var(--primary))" strokeWidth="1.5" markerEnd="url(#arrOY)" />
      <defs>
        <marker id="arrOY" markerWidth="5" markerHeight="4" refX="4" refY="2" orient="auto">
          <polygon points="0 0, 5 2, 0 4" fill="hsl(var(--primary))" />
        </marker>
      </defs>
      <text x="100" y="35" className="fill-primary" fontSize="7" fontWeight="bold">Y</text>
    </svg>
  );
}

/* ── 12. Offset Z do probe ───────────────────────────── */
export function IllustrationProbeOffsetZ() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Tool */}
      <rect x="30" y="10" width="18" height="50" rx="2" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <polygon points="33,60 45,60 39,72" fill="hsl(var(--muted-foreground))" opacity="0.5" />
      <text x="39" y="85" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Fresa</text>
      {/* Probe */}
      <rect x="110" y="10" width="14" height="40" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
      <circle cx="117" cy="54" r="3" fill="hsl(var(--primary))" />
      <text x="117" y="68" textAnchor="middle" className="fill-primary" fontSize="5">Probe</text>
      {/* Z offset arrow (between tool tip and probe tip) */}
      <line x1="75" y1="54" x2="75" y2="72" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="2,1" />
      <line x1="71" y1="54" x2="79" y2="54" stroke="hsl(var(--primary))" strokeWidth="1" />
      <line x1="71" y1="72" x2="79" y2="72" stroke="hsl(var(--primary))" strokeWidth="1" />
      {/* Horizontal reference lines */}
      <line x1="48" y1="72" x2="71" y2="72" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="120" y1="54" x2="79" y2="54" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="2,2" />
      <text x="75" y="95" textAnchor="middle" className="fill-primary" fontSize="7" fontWeight="bold">Offset Z</text>
      {/* Surface */}
      <rect x="10" y="98" width="160" height="6" rx="1" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5" />
    </svg>
  );
}

/* ── 13. Tipo de gravação ────────────────────────────── */
export function IllustrationEngravingType() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Normal — flat surface */}
      <line x1="5" y1="55" x2="55" y2="55" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <line x1="15" y1="45" x2="45" y2="45" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="30" y="38" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Normal</text>
      <text x="30" y="70" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Plana</text>
      {/* Curved — surface follows curve */}
      <path d="M65,60 Q90,40 115,55" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <path d="M72,50 Q90,32 108,47" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" />
      <text x="90" y="30" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Curva</text>
      <text x="90" y="70" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Superfície</text>
      {/* V-bit curved */}
      <path d="M125,58 Q150,38 175,52" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <polygon points="147,30 150,42 153,30" fill="hsl(var(--primary))" opacity="0.6" />
      <text x="150" y="24" textAnchor="middle" className="fill-primary" fontSize="5" fontWeight="bold">V-bit</text>
      <text x="150" y="70" textAnchor="middle" className="fill-primary" fontSize="5">Compensada</text>
      {/* Separators */}
      <line x1="60" y1="20" x2="60" y2="75" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
      <line x1="120" y1="20" x2="120" y2="75" stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray="2,2" />
    </svg>
  );
}

/* ── 14. Compensação V-bit ───────────────────────────── */
export function IllustrationVbitCompensation() {
  return (
    <svg viewBox="0 0 180 110" className="w-full">
      {/* Curved surface */}
      <path d="M10,75 Q45,45 90,60 Q135,75 170,50" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
      {/* Without compensation */}
      <polygon points="42,30 48,30 45,44" fill="hsl(var(--destructive))" opacity="0.5" />
      <line x1="45" y1="44" x2="45" y2="56" stroke="hsl(var(--destructive))" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="45" y="24" textAnchor="middle" className="fill-destructive" fontSize="5">Sem comp.</text>
      <text x="45" y="98" textAnchor="middle" className="fill-destructive" fontSize="6">Profundidade</text>
      <text x="45" y="106" textAnchor="middle" className="fill-destructive" fontSize="6">variável ✗</text>
      {/* With compensation */}
      <polygon points="125,26 131,26 128,40" fill="hsl(var(--primary))" opacity="0.7" />
      <line x1="128" y1="40" x2="128" y2="58" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="128" y="20" textAnchor="middle" className="fill-primary" fontSize="5">Com comp.</text>
      <text x="128" y="98" textAnchor="middle" className="fill-primary" fontSize="6">Profundidade</text>
      <text x="128" y="106" textAnchor="middle" className="fill-primary" fontSize="6">constante ✓</text>
    </svg>
  );
}

/* ── 15. Precisão das curvas ──────────────────────────── */
export function IllustrationCurvePrecision() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Original arc */}
      <path d="M15,70 Q50,10 90,40 Q130,70 165,20" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" opacity="0.3" />
      <text x="90" y="85" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Arco original</text>
      {/* Segmented arc */}
      <polyline points="15,70 30,45 45,28 60,22 75,28 90,40 105,50 120,55 135,48 150,35 165,20" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      {/* Segment points */}
      {[15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165].map((x, i) => {
        const yVals = [70, 45, 28, 22, 28, 40, 50, 55, 48, 35, 20];
        return <circle key={x} cx={x} cy={yVals[i]} r="2" fill="hsl(var(--primary))" />;
      })}
      <text x="140" y="12" className="fill-primary" fontSize="6" fontWeight="bold">Segmentos</text>
    </svg>
  );
}

/* ── 16. Simulação 3D ────────────────────────────────── */
export function IllustrationSimulation3D() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Isometric surface */}
      <path d="M20,60 L60,80 L160,50 L120,30 Z" fill="hsl(var(--muted))" opacity="0.3" stroke="hsl(var(--border))" strokeWidth="1" />
      {/* Surface height variation */}
      <path d="M40,55 Q60,45 80,52 Q100,60 120,48 Q140,38 155,42" fill="none" stroke="hsl(var(--border))" strokeWidth="1.5" />
      {/* Toolpath following surface */}
      <path d="M40,48 Q60,38 80,45 Q100,53 120,41 Q140,31 155,35" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" strokeDasharray="3,1" />
      {/* Tool */}
      <rect x="95" y="10" width="10" height="22" rx="1" fill="hsl(var(--primary))" opacity="0.6" />
      <polygon points="97,32 103,32 100,38" fill="hsl(var(--primary))" opacity="0.6" />
      {/* Vertical line to surface */}
      <line x1="100" y1="38" x2="100" y2="52" stroke="hsl(var(--primary))" strokeWidth="0.5" strokeDasharray="1,1" />
      <text x="30" y="15" className="fill-primary" fontSize="6" fontWeight="bold">3D</text>
    </svg>
  );
}

/* ── 17. Mapeamento por usinagem ──────────────────────── */
export function IllustrationMappingByMachining() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Already machined surface */}
      <path d="M10,60 Q50,40 90,55 Q130,70 170,45" fill="hsl(var(--muted))" opacity="0.3" stroke="hsl(var(--border))" strokeWidth="1.5" />
      <text x="90" y="78" textAnchor="middle" className="fill-muted-foreground" fontSize="5">Superfície anterior</text>
      {/* New toolpath */}
      <path d="M15,52 Q50,32 90,47 Q130,62 165,37" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      {/* Height reference lines */}
      {[35, 65, 95, 125, 155].map((x, i) => {
        const y1 = [48, 36, 47, 58, 42][i];
        const y2 = [56, 44, 55, 66, 48][i];
        return <line key={x} x1={x} y1={y1} x2={x} y2={y2} stroke="hsl(var(--primary))" strokeWidth="0.6" strokeDasharray="1,1" opacity="0.5" />;
      })}
      <text x="90" y="18" textAnchor="middle" className="fill-primary" fontSize="6" fontWeight="bold">Novo percurso</text>
    </svg>
  );
}

/* ── 18. Mapeamento por densidade ────────────────────── */
export function IllustrationDensityMapping() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Background: gcode path lines */}
      <path d="M20,20 L50,20 L50,35 L80,35 L80,20 L90,20 L90,50 L105,50 L105,20 L110,20" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.3" />
      <path d="M120,30 L150,30 L150,60 L160,60" fill="none" stroke="hsl(var(--muted-foreground))" strokeWidth="0.8" opacity="0.3" />
      {/* Sparse points (simple area) */}
      {[25, 50, 75].map((x) =>
        [25, 55].map((y) => (
          <circle key={`sp-${x}-${y}`} cx={x} cy={y} r="2.5" fill="hsl(var(--primary))" opacity="0.3" />
        ))
      )}
      {/* Dense points (detail area) */}
      {[95, 105, 115, 125, 135, 145, 155].map((x) =>
        [15, 27, 39, 51, 63, 75].map((y) => (
          <circle key={`dp-${x}-${y}`} cx={x} cy={y} r="2" fill="hsl(var(--primary))" opacity="0.65" />
        ))
      )}
      {/* Highlight zone */}
      <rect x="90" y="10" width="70" height="72" rx="4" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="3,2" />
      <text x="125" y="5" textAnchor="middle" className="fill-primary" fontSize="5" fontWeight="bold">+ pontos</text>
    </svg>
  );
}

/* ── 19. Varredura rápida ────────────────────────────── */
export function IllustrationFastSweep() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Workpiece */}
      <rect x="15" y="10" width="150" height="65" rx="3" fill="hsl(var(--muted))" opacity="0.2" stroke="hsl(var(--border))" strokeWidth="0.8" />
      {/* Serpentine scan lines */}
      <path d="M25,20 L155,20 L155,32 L25,32 L25,44 L155,44 L155,56 L25,56 L25,68 L155,68" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      {/* Arrow heads at turns */}
      <polygon points="153,18 157,20 153,22" fill="hsl(var(--primary))" />
      <polygon points="27,30 23,32 27,34" fill="hsl(var(--primary))" />
      <polygon points="153,42 157,44 153,46" fill="hsl(var(--primary))" />
      <polygon points="27,54 23,56 27,58" fill="hsl(var(--primary))" />
      <polygon points="153,66 157,68 153,70" fill="hsl(var(--primary))" />
      <text x="90" y="85" textAnchor="middle" className="fill-primary" fontSize="6" fontWeight="bold">Serpentina rápida</text>
    </svg>
  );
}

/* ── 20. Superfície curva inclinada ──────────────────── */
export function IllustrationCurvedSurface() {
  return (
    <svg viewBox="0 0 180 90" className="w-full">
      {/* Inclined surface / ramp */}
      <path d="M15,75 L165,30" stroke="hsl(var(--border))" strokeWidth="2" />
      <path d="M15,80 L165,35 L165,80 Z" fill="hsl(var(--muted))" opacity="0.3" />
      {/* Toolpath following the surface */}
      <path d="M25,69 L55,58 L85,47 L115,36 L145,28" fill="none" stroke="hsl(var(--primary))" strokeWidth="1.2" />
      {/* Vertical tool lines at points */}
      {[25, 55, 85, 115, 145].map((x, i) => {
        const yBase = [72, 60, 49, 38, 30][i];
        return (
          <g key={x}>
            <line x1={x} y1={yBase - 18} x2={x} y2={yBase} stroke="hsl(var(--primary))" strokeWidth="0.6" strokeDasharray="1,1" opacity="0.5" />
            <circle cx={x} cy={yBase} r="2" fill="hsl(var(--primary))" />
            {/* Mini tool */}
            <rect x={x - 3} y={yBase - 18} width="6" height="10" rx="1" fill="hsl(var(--primary))" opacity="0.4" />
          </g>
        );
      })}
      <text x="90" y="15" textAnchor="middle" className="fill-primary" fontSize="6" fontWeight="bold">Acompanha a inclinação</text>
    </svg>
  );
}

/* ── Illustration registry ────────────────────────────── */
export type IllustrationKey =
  | "safeHeight" | "spacingX" | "spacingY" | "probeFeed"
  | "probeDepth" | "touchPrecision"
  | "mappingUniform" | "mappingSmart" | "retraction"
  | "probeOffset" | "probeOffsetX" | "probeOffsetY" | "probeOffsetZ"
  | "engravingType" | "vbitCompensation" | "curvePrecision"
  | "simulation3D" | "mappingByMachining" | "densityMapping"
  | "fastSweep" | "curvedSurface";

export const ILLUSTRATIONS: Record<IllustrationKey, () => JSX.Element> = {
  safeHeight: IllustrationSafeHeight,
  spacingX: IllustrationSpacingX,
  spacingY: IllustrationSpacingY,
  probeFeed: IllustrationProbeFeed,
  probeDepth: IllustrationProbeDepth,
  touchPrecision: IllustrationTouchPrecision,
  mappingUniform: IllustrationMappingUniform,
  mappingSmart: IllustrationMappingSmart,
  retraction: IllustrationRetraction,
  probeOffset: IllustrationProbeOffset,
  probeOffsetX: IllustrationProbeOffsetX,
  probeOffsetY: IllustrationProbeOffsetY,
  probeOffsetZ: IllustrationProbeOffsetZ,
  engravingType: IllustrationEngravingType,
  vbitCompensation: IllustrationVbitCompensation,
  curvePrecision: IllustrationCurvePrecision,
  simulation3D: IllustrationSimulation3D,
  mappingByMachining: IllustrationMappingByMachining,
  densityMapping: IllustrationDensityMapping,
  fastSweep: IllustrationFastSweep,
  curvedSurface: IllustrationCurvedSurface,
};

import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type JSX, type ReactElement } from "react";
import styled, { keyframes } from "styled-components";
import { colors } from "../../styles/tokens";
import { prefersReducedMotion } from "../../utils/prefersReducedMotion";
import type { DiagramGeometry, DiagramNode, DiagramShape } from "./geometry";
import {
  BEAD_BREATH_GROW,
  BEAD_BREATH_MAX_DELAY,
  BEAD_BREATH_SECONDS,
  BEAD_REFERENCE_RADIUS,
  BLEED_LINE_SCALE,
  CORE_CENTER_SCALE,
  CORE_LINE_WIDTH,
  CORE_SOFT_BLUR,
  CORE_SOFT_LINE_OPACITY,
  CORE_SOFT_LINE_WIDTH,
  GLOW_LAYERS,
  IGNITION_BEAD_DELAY_SECONDS,
  IGNITION_BEAD_POP_SECONDS,
  IGNITION_GLOW_DELAY_SECONDS,
  IGNITION_GLOW_SECONDS,
  IGNITION_LINE_SECONDS,
  IGNITION_STAGGER_SECONDS,
  PAINTED_BEAD_SCALE,
  PAINTED_LINE_SCALE,
  SHAPE_STROKE_SCALE,
  SWELL_DURATION_MS,
  SWELL_GROW,
  SWELL_INTERVAL_MS,
} from "./glowLayers";
import { resolvePaint, type PaintSpec } from "./paint";

export type DiagramColor = "physical" | "mental" | "nen";

export interface GlowDiagramProps {
  geometry: DiagramGeometry;
  color: DiagramColor;
  paint?: PaintSpec; // padrão "all"
  label?: string; // com rótulo vira role="img"; sem, é decorativo (aria-hidden)
}

const HUE: Record<DiagramColor, string> = {
  physical: colors.diagramPhysical,
  mental: colors.diagramMental,
  nen: colors.diagramNen,
};

const LIGHT = colors.diagramLight;
const HALO = colors.diagramLightHalo;

type Stop = [offset: number, color: string, opacity?: number];

// Corpo da bolinha: branco pequeno no centro, degradê longo até a cor, some na borda.
function beadStops(color: DiagramColor): Stop[] {
  if (color === "physical") {
    return [
      [0, LIGHT],
      [0.16, LIGHT],
      [0.34, colors.diagramPhysicalWarm],
      [0.55, colors.diagramPhysical],
      [0.78, colors.diagramPhysical, 0.55],
      [1, colors.diagramPhysical, 0],
    ];
  }
  const hue = HUE[color];
  return [
    [0, LIGHT],
    [0.16, LIGHT],
    [0.46, hue],
    [0.75, hue, 0.55],
    [1, hue, 0],
  ];
}

const WHITE_BEAD_STOPS: Stop[] = [
  [0, LIGHT],
  [0.3, LIGHT],
  [0.6, colors.diagramLightFadeNear],
  [0.8, colors.diagramLightFadeFar, 0.55],
  [1, colors.diagramLightFadeFar, 0],
];

const CENTER_STOPS: Stop[] = [
  [0, LIGHT],
  [0.45, LIGHT],
  [1, LIGHT, 0],
];

const BLEED_STOPS = (hue: string): Stop[] => [
  [0, hue, 1],
  [0.55, hue, 0.6],
  [1, hue, 0],
];

const renderStops = (stops: Stop[]) =>
  stops.map(([offset, color, opacity]) => (
    <stop key={offset} offset={offset} stopColor={color} stopOpacity={opacity ?? 1} />
  ));

// Pseudoaleatório determinístico (puro): cada instância tem a sua semente, então
// diagramas lado a lado não respiram em sincronia.
function hashSeed(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h % 1000);
}
const noise = (seed: number, i: number) => {
  const x = Math.sin((seed + 1) * 97.13 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const vars = (v: Record<string, string | number>) => v as CSSProperties;

function GlowDiagram({ geometry, color, paint = "all", label }: GlowDiagramProps): JSX.Element {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, "");
  const seed = hashSeed(rawId);
  const svgRef = useRef<SVGSVGElement>(null);
  const [reduced] = useState(prefersReducedMotion);
  const [visible, setVisible] = useState(true);

  // Fora da tela: pausa as animações CSS e o inchaço.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  // A cada pouco, uma bolinha (em todas as camadas) abre o halo um pouco mais.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || reduced || !visible) return;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const interval = setInterval(() => {
      if (prefersReducedMotion()) return;
      const node = geometry.nodes[Math.floor(Math.random() * geometry.nodes.length)];
      if (!node) return;
      const beads = svg.querySelectorAll(`.bead[data-node="${node.id}"]`);
      if (Array.from(beads).some((b) => b.classList.contains("swell"))) return;
      beads.forEach((b) => b.classList.add("swell"));
      const t = setTimeout(() => {
        beads.forEach((b) => b.classList.remove("swell"));
        timers.delete(t);
      }, SWELL_DURATION_MS);
      timers.add(t);
    }, SWELL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      timers.forEach(clearTimeout);
      svg.querySelectorAll(".swell").forEach((b) => b.classList.remove("swell"));
    };
  }, [reduced, visible, geometry]);

  // A ficha re-renderiza a cada tecla: o desenho só muda com geometria, pintura, cor ou id.
  const content = useMemo(() => drawDiagram(geometry, color, paint, id, seed), [geometry, color, paint, id, seed]);

  return (
    <Svg
      ref={svgRef}
      viewBox={geometry.viewBox}
      overflow="visible"
      data-motion={reduced ? "off" : "on"}
      data-paused={visible ? undefined : "true"}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      {content}
    </Svg>
  );
}

export default memo(GlowDiagram);

// Desenho puro do diagrama (defs, camadas de luz e núcleo); memorizado no componente.
function drawDiagram(
  geometry: DiagramGeometry,
  color: DiagramColor,
  paint: PaintSpec,
  id: string,
  seed: number,
): JSX.Element {
  const resolved = resolvePaint(geometry, paint);
  const hue = HUE[color];
  const byId = new Map(geometry.nodes.map((n) => [n.id, n]));
  const widen = !resolved.all;

  const ref = (name: string) => `url(#${id}-${name})`;
  const beadFill = (painted: boolean) => (painted ? ref("bead") : ref("bead-light"));

  const shapeHalo = (s: DiagramShape, width: number, stroke: string, key: string) =>
    s.kind === "ellipse" ? (
      <ellipse key={key} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="none" stroke={stroke} strokeWidth={width} />
    ) : (
      <path
        key={key}
        d={s.d}
        fill={stroke}
        stroke={stroke}
        strokeWidth={width * SHAPE_STROKE_SCALE}
        strokeLinejoin="round"
      />
    );

  // Uma camada = um grupo desfocado com TODAS as peças: a luz é uma só, sem emendas.
  const layers = GLOW_LAYERS.map((layer, li) => {
    const pieces: [boolean, ReactElement][] = [];
    geometry.shapes.forEach((s, si) => {
      const p = resolved.all;
      pieces.push([p, shapeHalo(s, layer.line, p ? hue : HALO, `s${si}`)]);
    });
    geometry.segments.forEach(([a, b]) => {
      const A = byId.get(a)!;
      const B = byId.get(b)!;
      const p = resolved.isSegmentPainted(a, b);
      pieces.push([
        p,
        <line
          key={`l${a}-${b}`}
          x1={A.x}
          y1={A.y}
          x2={B.x}
          y2={B.y}
          stroke={p ? hue : HALO}
          strokeWidth={layer.line * (p && widen ? PAINTED_LINE_SCALE : 1)}
          strokeLinecap="round"
        />,
      ]);
    });
    geometry.nodes.forEach((n, ni) => {
      const p = resolved.isNodePainted(n.id);
      const s = n.r / BEAD_REFERENCE_RADIUS;
      const k = li * 100 + ni * 3;
      const [minDur, maxDur] = BEAD_BREATH_SECONDS;
      pieces.push([
        p,
        <circle
          key={`c${n.id}`}
          className="bead"
          data-node={n.id}
          cx={n.x}
          cy={n.y}
          r={n.r * layer.ring * (p && widen ? PAINTED_BEAD_SCALE : 1)}
          fill={p ? hue : HALO}
          style={vars({
            "--bdur": `${minDur + noise(seed, k) * (maxDur - minDur)}s`,
            "--bdelay": `${-noise(seed, k + 1) * BEAD_BREATH_MAX_DELAY}s`,
            "--bgrow": 1 + BEAD_BREATH_GROW * s,
            "--sgrow": 1 + SWELL_GROW * s,
          })}
        />,
      ]);
    });
    return (
      <g
        key={li}
        className="layer"
        data-glow-layer={li}
        filter={ref(`blur${li}`)}
        style={vars({
          "--lo": layer.lo,
          "--hi": layer.hi,
          "--dur": `${layer.breathSeconds}s`,
          "--delay": `${-noise(seed, 1000 + li) * layer.breathSeconds}s`,
        })}
      >
        {/* branco primeiro, colorido por cima, e o vazamento por último */}
        {pieces.filter(([p]) => !p).map(([, el]) => el)}
        {pieces.filter(([p]) => p).map(([, el]) => el)}
        {resolved.bleeds.map((bl, bi) => (
          <line
            key={`b${bi}`}
            x1={bl.from.x}
            y1={bl.from.y}
            x2={bl.to.x}
            y2={bl.to.y}
            stroke={ref(`bleed${bi}`)}
            strokeWidth={layer.line * BLEED_LINE_SCALE}
            strokeLinecap="round"
          />
        ))}
      </g>
    );
  });

  const popDelay = (i: number) => vars({ "--d0": `${IGNITION_BEAD_DELAY_SECONDS + i * IGNITION_STAGGER_SECONDS}s` });
  const coreDot = (n: DiagramNode, i: number, r: number, fill: string, key: string) => (
    <circle key={key} className="core-dot" cx={n.x} cy={n.y} r={r} fill={fill} style={popDelay(i)} />
  );

  return (
    <>
        <defs>
          <filter id={`${id}-blur-core`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={CORE_SOFT_BLUR} />
          </filter>
          {GLOW_LAYERS.map((layer, li) => (
            <filter
              key={li}
              id={`${id}-blur${li}`}
              x={`${-layer.region * 100}%`}
              y={`${-layer.region * 100}%`}
              width={`${(1 + 2 * layer.region) * 100}%`}
              height={`${(1 + 2 * layer.region) * 100}%`}
            >
              <feGaussianBlur stdDeviation={layer.blur} />
            </filter>
          ))}
          <radialGradient id={`${id}-bead`}>{renderStops(beadStops(color))}</radialGradient>
          <radialGradient id={`${id}-bead-light`}>{renderStops(WHITE_BEAD_STOPS)}</radialGradient>
          <radialGradient id={`${id}-center`}>{renderStops(CENTER_STOPS)}</radialGradient>
          {/* degradê da cor ao longo da linha: forte na bolinha, some no fim do vazamento */}
          {resolved.bleeds.map((bl, bi) => (
            <linearGradient
              key={bi}
              id={`${id}-bleed${bi}`}
              gradientUnits="userSpaceOnUse"
              x1={bl.from.x}
              y1={bl.from.y}
              x2={bl.to.x}
              y2={bl.to.y}
            >
              {renderStops(BLEED_STOPS(hue))}
            </linearGradient>
          ))}
        </defs>
        <g className="glow">{layers}</g>
        {/* núcleo: corpo da esfera, depois o filamento branco (formas e linhas), depois o miolo */}
        {geometry.nodes.map((n, i) => coreDot(n, i, n.r, beadFill(resolved.isNodePainted(n.id)), `body${n.id}`))}
        {geometry.shapes.map((s, si) =>
          s.kind === "ellipse" ? (
            <g key={`cs${si}`}>
              <ellipse
                cx={s.cx}
                cy={s.cy}
                rx={s.rx}
                ry={s.ry}
                fill="none"
                stroke={LIGHT}
                strokeWidth={CORE_SOFT_LINE_WIDTH}
                strokeOpacity={CORE_SOFT_LINE_OPACITY}
                filter={ref("blur-core")}
              />
              <ellipse cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} fill="none" stroke={LIGHT} strokeWidth={CORE_LINE_WIDTH} />
            </g>
          ) : (
            <path key={`cs${si}`} d={s.d} fill={LIGHT} />
          ),
        )}
        {geometry.segments.map(([a, b], i) => {
          const A = byId.get(a)!;
          const B = byId.get(b)!;
          const style = vars({
            "--len": Math.hypot(B.x - A.x, B.y - A.y),
            "--d0": `${i * IGNITION_STAGGER_SECONDS}s`,
          });
          return (
            <g key={`cl${a}-${b}`}>
              <line
                className="core-line"
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={LIGHT}
                strokeWidth={CORE_SOFT_LINE_WIDTH}
                strokeOpacity={CORE_SOFT_LINE_OPACITY}
                filter={ref("blur-core")}
                style={style}
              />
              <line
                className="core-line"
                x1={A.x}
                y1={A.y}
                x2={B.x}
                y2={B.y}
                stroke={LIGHT}
                strokeWidth={CORE_LINE_WIDTH}
                style={style}
              />
            </g>
          );
        })}
        {geometry.nodes.map((n, i) => coreDot(n, i, n.r * CORE_CENTER_SCALE, ref("center"), `center${n.id}`))}
    </>
  );
}

const layerBreathe = keyframes`
  0%, 100% { opacity: var(--lo); }
  50% { opacity: var(--hi); }
`;
const beadBreathe = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(var(--bgrow)); }
`;
const beadSwell = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(var(--sgrow)); }
`;
const drawLine = keyframes`
  to { stroke-dashoffset: 0; }
`;
const popBead = keyframes`
  to { transform: scale(1); }
`;
const glowIn = keyframes`
  to { opacity: 1; }
`;

// Estado final (sem movimento) é o padrão; as animações só entram com data-motion="on".
const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;

  line {
    stroke-linecap: round;
    fill: none;
  }

  .layer {
    opacity: var(--hi);
  }

  .bead,
  .core-dot {
    transform-box: fill-box;
    transform-origin: center;
  }

  &[data-motion="on"] {
    .layer {
      animation: ${layerBreathe} var(--dur) ease-in-out var(--delay) infinite;
    }
    .bead {
      animation: ${beadBreathe} var(--bdur) ease-in-out var(--bdelay) infinite;
    }
    .bead.swell {
      animation: ${beadSwell} ${SWELL_DURATION_MS / 1000}s ease-in-out 1;
    }
    .core-line {
      stroke-dasharray: var(--len);
      stroke-dashoffset: var(--len);
      animation: ${drawLine} ${IGNITION_LINE_SECONDS}s ease-out var(--d0) forwards;
    }
    .core-dot {
      transform: scale(0);
      animation: ${popBead} ${IGNITION_BEAD_POP_SECONDS}s ease-out var(--d0) forwards;
    }
    .glow {
      opacity: 0;
      animation: ${glowIn} ${IGNITION_GLOW_SECONDS}s ease-out ${IGNITION_GLOW_DELAY_SECONDS}s forwards;
    }
  }

  &[data-paused="true"] * {
    animation-play-state: paused !important;
  }

  @media (prefers-reduced-motion: reduce) {
    &[data-motion="on"] {
      .layer,
      .bead,
      .bead.swell,
      .core-line,
      .core-dot,
      .glow {
        animation: none;
      }
      .glow {
        opacity: 1;
      }
      .core-line {
        stroke-dashoffset: 0;
      }
      .core-dot {
        transform: none;
      }
    }
  }
`;

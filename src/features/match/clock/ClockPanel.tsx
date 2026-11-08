// O painel do relógio do mestre (§8.2 do spec), ancorado embaixo da pílula. Três níveis de
// profundidade (dono): 1) a hora, o tempo real e os botões rápidos +1 h / +1 min, que mudam
// o relógio na hora; 2) "Mais", mais escondido, com +1 s e os de voltar; 3) a edição direta,
// o único lugar com "Aplicar" (junto de "Passar dias", que abre nele já com +1 dia).
import { useEffect, useId, useRef, useState } from "react";
import type { RefObject } from "react";
import styled from "styled-components";
import Collapse from "../../../components/atoms/Collapse";
import Tooltip from "../../../components/ions/Tooltip";
import { alpha, colors } from "../../../styles/tokens";
import type { RoundMode } from "../combat/combatMessages";
import { PanelTitle } from "../combat/panelStyles";
import ClockEditor from "./ClockEditor";
import type { LimitReason } from "./clockMessages";
import { CLOCK_PILL_OFFSET, CLOCK_PILL_Z_INDEX } from "./clockLayout";
import { addSeconds, compareStory, formatDateBR, formatDelta, formatTime } from "./storyTime";
import type { StoryClockView } from "./useStoryClock";

const DAY = 86_400;

/** Por que o relógio não volta antes do limite, como o mestre lê. */
const LIMIT_REASON_COPY: Record<LimitReason, string> = {
  start: "início da partida",
  turn: "último turno",
  scene: "troca de cena",
  roundMode: "troca de regime",
  round: "último round",
};

const RACE_PLAY_REASON = "No turno disputado, cada round vale 1 segundo.";

const QUICK = [
  { label: "+1 h", delta: 3600 },
  { label: "+1 min", delta: 60 },
] as const;

const MORE = [
  { label: "+1 s", delta: 1 },
  { label: "−1 h", delta: -3600 },
  { label: "−1 min", delta: -60 },
  { label: "−1 s", delta: -1 },
] as const;

/** "Não volta antes de 08:12:40 — último turno"; o limite em outro dia leva a data. */
function limitText(now: string, limitAt: string, reason: LimitReason | ""): string {
  const sameDay = formatDateBR(limitAt) === formatDateBR(now);
  const at = `${sameDay ? "" : `${formatDateBR(limitAt)} `}${formatTime(limitAt)}`;
  return `Não volta antes de ${at}${reason ? ` — ${LIMIT_REASON_COPY[reason]}` : ""}`;
}

export default function ClockPanel({
  clock,
  roundMode,
  anchorRef,
  onAdjust,
  onSet,
  onPlay,
  onPause,
  onClose,
}: {
  clock: StoryClockView;
  roundMode: RoundMode | "";
  /** A pílula: clicar nela não conta como "fora" (ela mesma alterna) e o foco volta para ela. */
  anchorRef?: RefObject<HTMLElement | null>;
  onAdjust: (deltaSeconds: number) => void;
  onSet: (storyAt: string, confirmLongSkip: boolean) => void;
  onPlay: () => void;
  onPause: () => void;
  onClose: () => void;
}) {
  const { now, running, limitAt, limitReason, realElapsedSeconds } = clock;
  const panelRef = useRef<HTMLDivElement>(null);
  const moreId = useId();
  const [moreOpen, setMoreOpen] = useState(false);
  // Edição direta aberta: com o valor inicial (a hora atual ou +1 dia).
  const [editing, setEditing] = useState<string | null>(null);

  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; });

  // Esc e toque fora fecham; a pílula fica de fora (ela mesma fecha ao alternar).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (panelRef.current?.contains(t) || anchorRef?.current?.contains(t)) return;
      closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [anchorRef]);

  // O foco entra no painel ao abrir (e a cada troca de nível); ao fechar volta para a pílula,
  // a menos que o mestre já tenha posto o foco em outro lugar (clicou num campo fora).
  useEffect(() => {
    panelRef.current?.focus();
  }, [editing]);
  useEffect(() => {
    const panel = panelRef.current;
    const anchor = anchorRef?.current;
    return () => {
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) {
        (anchor?.querySelector<HTMLElement>("button") ?? anchor)?.focus();
      }
    };
  }, [anchorRef]);

  const crossesLimit = (delta: number) =>
    delta < 0 && now !== null && limitAt !== null && compareStory(addSeconds(now, delta), limitAt) < 0;
  const limitLine = now && limitAt ? limitText(now, limitAt, limitReason) : null;
  const race = roundMode === "Race";
  const playBlocked = !running && race;

  const deltaButton = ({ label, delta }: { label: string; delta: number }) => {
    const blocked = crossesLimit(delta);
    return (
      <Tooltip key={label} label={limitLine ?? ""} enabled={blocked} stretch>
        <Chip
          type="button"
          aria-disabled={blocked || undefined}
          onClick={blocked ? undefined : () => onAdjust(delta)}
        >
          {label}
        </Chip>
      </Tooltip>
    );
  };

  return (
    <Panel ref={panelRef} role="dialog" aria-label="Controles do relógio" tabIndex={-1}>
      {now === null ? (
        <Unset>Hora a definir</Unset>
      ) : editing !== null ? (
        <>
          <EditTitle>Editar hora</EditTitle>
          <ClockEditor
            base={now}
            minimum={limitAt}
            minimumReason={limitReason ? LIMIT_REASON_COPY[limitReason] : undefined}
            initial={editing}
            submitLabel="Aplicar"
            onSubmit={(storyAt, confirm) => {
              onSet(storyAt, confirm);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        </>
      ) : (
        <>
          <Head>
            <BigTime type="button" aria-label={`Editar hora (${formatTime(now)})`} onClick={() => setEditing(now)}>
              {formatTime(now)}
            </BigTime>
            <DateText>{formatDateBR(now)}</DateText>
            {limitLine && <Limit data-testid="clock-limit">{limitLine}</Limit>}
          </Head>

          {/* aria-disabled (e não disabled): segue focável e o porquê aparece no foco e no toque. */}
          <Tooltip label={RACE_PLAY_REASON} enabled={playBlocked} stretch>
            <PlayButton
              type="button"
              $running={running}
              aria-disabled={playBlocked || undefined}
              onClick={playBlocked ? undefined : running ? onPause : onPlay}
            >
              <Glyph aria-hidden="true">{running ? "❚❚" : "▶"}</Glyph>
              {running ? "Pausar" : "Tempo real"}
            </PlayButton>
          </Tooltip>
          {running && (
            <Live>
              <LiveDot aria-hidden="true" />
              {`ligado há ${formatDelta(realElapsedSeconds).replace(/^\+/, "")}`}
            </Live>
          )}

          <ChipRow>{QUICK.map(deltaButton)}</ChipRow>

          <SecondaryRow>
            <TextButton type="button" onClick={() => setEditing(addSeconds(now, DAY))}>
              Passar dias
            </TextButton>
            <TextButton
              type="button"
              aria-expanded={moreOpen}
              aria-controls={moreId}
              onClick={() => setMoreOpen((o) => !o)}
            >
              ⋯ Mais
            </TextButton>
          </SecondaryRow>

          <Collapse open={moreOpen} id={moreId}>
            <ChipRow $more>{MORE.map(deltaButton)}</ChipRow>
          </Collapse>
        </>
      )}
    </Panel>
  );
}

// Sem `transform`: o diálogo de confirmação de salto longo é `position: fixed` aqui dentro, e
// um ancestral com transform o prenderia no painel. Centraliza com margem automática.
const Panel = styled.div`
  position: absolute;
  top: ${CLOCK_PILL_OFFSET + 8}px;
  left: 0;
  right: 0;
  margin: 0 auto;
  z-index: ${CLOCK_PILL_Z_INDEX};
  box-sizing: border-box;
  width: min(340px, calc(100% - 32px));
  max-height: calc(100% - ${CLOCK_PILL_OFFSET + 16}px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid ${colors.overlayHighlight};
  background: ${colors.surfaceSidebar};
  box-shadow: 0 10px 28px ${colors.shadowStrong};
  color: ${colors.textPrimary};
  font-variant-numeric: tabular-nums;
  pointer-events: auto;
  outline: none;
`;

const Head = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
`;

const BigTime = styled.button`
  padding: 2px 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: ${colors.textPrimary};
  font: inherit;
  font-size: 34px;
  font-weight: 600;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  cursor: pointer;

  &:hover {
    border-color: ${colors.borderInput};
    background: ${colors.surfaceInput};
  }
`;

const DateText = styled.span`
  font-size: 13px;
  color: ${colors.textPlaceholderStrong};
`;

const Limit = styled.span`
  margin-top: 4px;
  font-size: 12px;
  color: ${colors.textPlaceholderStrong};
  text-align: center;
`;

const PlayButton = styled.button<{ $running: boolean }>`
  flex: 1 1 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  border-radius: 8px;
  border: 1px solid ${({ $running }) => ($running ? colors.statusOngoing : "transparent")};
  background: ${({ $running }) => ($running ? alpha(colors.statusOngoing, 0.12) : colors.brandAccent)};
  color: ${colors.textPrimary};
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;

  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const Glyph = styled.span`
  font-size: 14px;
  letter-spacing: -0.1em;
`;

const Live = styled.p`
  margin: -4px 0 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  color: ${colors.textMuted};
`;

const LiveDot = styled.span`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${colors.statusOngoing};
`;

const ChipRow = styled.div<{ $more?: boolean }>`
  display: grid;
  grid-template-columns: repeat(${({ $more }) => ($more ? 4 : 2)}, 1fr);
  gap: 8px;
  ${({ $more }) => ($more ? "padding-top: 4px;" : "")}
`;

const Chip = styled.button`
  flex: 1 1 auto;
  min-height: 40px;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;

  &:hover:not([aria-disabled="true"]) {
    background: ${colors.surfaceInputHover};
  }
  &[aria-disabled="true"] {
    opacity: 0.45;
    cursor: not-allowed;
  }
`;

const SecondaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

const TextButton = styled.button`
  min-height: 40px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: ${colors.textMuted};
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  &:hover,
  &[aria-expanded="true"] {
    color: ${colors.textPrimary};
  }
`;

const EditTitle = styled(PanelTitle)`
  text-align: center;
`;

const Unset = styled.p`
  margin: 0;
  text-align: center;
  font-style: italic;
  color: ${colors.textPlaceholderStrong};
`;

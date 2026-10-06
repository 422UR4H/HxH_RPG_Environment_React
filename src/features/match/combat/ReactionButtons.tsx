import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, PointerEvent } from "react";
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import { createHoldTracker } from "../../tactical-map/hooks/useHoldGesture";
import { REACTION_BUTTONS, REACTION_BUTTON_LABELS } from "./reactionModel";
import type { ReactionButton, ReactionStatus } from "./reactionModel";

const STATUS_TEXT: Record<Exclude<ReactionStatus, "available">, string> = {
  sending: "Enviando a reação…",
  attached: "Reação enviada — aguardando o mestre",
  opened: "O mestre deu a palavra — narre sua reação",
};

/**
 * Os botões de reação de UM alvo meu. Toque rápido envia o botão como está; segurar (ou
 * botão direito) abre a configuração — o mesmo gesto de segurar da Fase 6, sem um segundo
 * mecanismo. Fora de "available" mostra só em que pé a reação está.
 */
export default function ReactionButtons({
  status,
  name,
  showName,
  compact,
  onQuick,
  onConfigure,
}: {
  status: ReactionStatus;
  name: string;
  /** No painel, e no mapa quando o dono tem mais de um alvo. */
  showName?: boolean;
  /** No mapa: menor, para não cobrir as peças vizinhas. */
  compact?: boolean;
  onQuick: (b: ReactionButton) => void;
  onConfigure: (b: ReactionButton) => void;
}) {
  // O timer do tracker dispara fora do render: lê sempre o callback mais novo.
  const onConfigureRef = useRef(onConfigure);
  useEffect(() => { onConfigureRef.current = onConfigure; }, [onConfigure]);
  // Este press já abriu a configuração? O toque longo do Android dispara `contextmenu`
  // logo depois do nosso timer — sem isto a configuração abriria duas vezes.
  const configuredRef = useRef(false);
  const [tracker] = useState(() =>
    createHoldTracker({
      onHold: (id) => {
        configuredRef.current = true;
        onConfigureRef.current(id as ReactionButton);
      },
    }),
  );
  // Desmontar no meio de um segurar não pode abrir a configuração depois.
  useEffect(() => () => tracker.cancel(), [tracker]);

  const label = showName ? `Reagir — ${name}` : "Reagir";

  if (status !== "available") {
    return (
      <Box $compact={!!compact} role="status">
        {showName && <GroupLabel>{name}</GroupLabel>}
        <StatusText>{STATUS_TEXT[status]}</StatusText>
      </Box>
    );
  }

  const handlePointerDown = (b: ReactionButton) => (e: PointerEvent<HTMLButtonElement>) => {
    configuredRef.current = false;
    // Botão direito fica só com o `contextmenu`: o pointerup dele chega antes do menu no
    // Windows (R20) e, se o tracker estivesse armado, viraria um envio.
    if (e.button !== 0) { tracker.cancel(); return; }
    tracker.start(b, e.clientX, e.clientY);
  };
  const handlePointerUp = (b: ReactionButton) => (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    // "hold" já chamou onConfigure no timer; só o "click" envia.
    if (tracker.end() === "click") onQuick(b);
  };
  const handleContextMenu = (b: ReactionButton) => (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (configuredRef.current) return;
    tracker.cancel();
    configuredRef.current = true;
    onConfigure(b);
  };
  const handleKeyDown = (b: ReactionButton) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    // Tecla segurada repete o keydown: um envio por toque.
    if (e.repeat) return;
    if (e.shiftKey) onConfigure(b);
    else onQuick(b);
  };

  return (
    <Box $compact={!!compact} role="group" aria-label={`Reagir — ${name}`}>
      <GroupLabel>{label}</GroupLabel>
      <Row>
        {REACTION_BUTTONS.map((b) => (
          <Button
            key={b}
            type="button"
            $compact={!!compact}
            aria-label={`${REACTION_BUTTON_LABELS[b]} — segure para configurar`}
            onPointerDown={handlePointerDown(b)}
            onPointerMove={(e) => tracker.move(e.clientX, e.clientY)}
            onPointerUp={handlePointerUp(b)}
            onPointerCancel={() => tracker.cancel()}
            onContextMenu={handleContextMenu(b)}
            onKeyDown={handleKeyDown(b)}
          >
            {REACTION_BUTTON_LABELS[b]}
          </Button>
        ))}
      </Row>
    </Box>
  );
}

const Box = styled.div<{ $compact: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: ${({ $compact }) => ($compact ? "4px 6px" : "8px")};
  border-radius: 8px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: ${({ $compact }) => ($compact ? "11px" : "12px")};
`;

const GroupLabel = styled.span`
  font-weight: 600;
  color: ${colors.textMuted};
`;

const StatusText = styled.span`
  color: ${colors.textMuted};
`;

const Row = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
`;

const Button = styled.button<{ $compact: boolean }>`
  padding: 4px 8px;
  border: 1px solid ${colors.brandAccent};
  border-radius: 6px;
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: ${({ $compact }) => ($compact ? "11px" : "12px")};
  cursor: pointer;
  /* Segurar no toque não pode selecionar o texto nem abrir o balão do sistema. */
  user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;

  &:focus-visible {
    outline: 2px solid ${colors.brandAccentBright};
    outline-offset: 1px;
  }
`;

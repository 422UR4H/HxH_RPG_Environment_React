// src/features/match/WallActionSheet.tsx
//
// Extraído do GamePage.tsx anterior, sem mudança de comportamento (Tarefa 12, passo 3).
//
// R23: este é o único lugar da Fase 6 onde `isMaster` continua descendo (I2 tem uma
// exceção declarada aqui) — o menu de parede tem verbos diferentes por papel
// (enqueue_master_action × enqueue_action), e essa distinção é do protocolo, não de
// visibilidade. O componente decide QUAIS botões mostrar; quem manda o WS é a página, via
// `onInteract`/`onAttack`.
import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";
import type { WallSegment, WallType } from "../../types/tacticalMap";

const WALL_TYPE_LABELS: Record<WallType, string> = {
  door: "Porta",
  window: "Janela",
  terrain: "Terreno",
  secret_door: "P. Secreta",
  wall: "Parede",
};

export default function WallActionSheet({
  wall,
  isMaster,
  onInteract,
  onAttack,
  onClose,
}: {
  wall: WallSegment;
  isMaster: boolean;
  onInteract: (kind: "open" | "close" | "lockpick") => void;
  onAttack: () => void;
  onClose: () => void;
}) {
  return (
    <WallActionOverlay onClick={onClose}>
      <WallActionMenu onClick={(e) => e.stopPropagation()}>
        {isMaster && <MasterActionBadge>Ação do Mestre</MasterActionBadge>}
        <WallActionTitle>{WALL_TYPE_LABELS[wall.wallType]}</WallActionTitle>

        {/* Open/Close — master ignores locked; player is blocked when locked */}
        {(wall.wallType === "door" || wall.wallType === "window") &&
          (isMaster ? (
            <WallActionButton onClick={() => onInteract(wall.open ? "close" : "open")}>
              {wall.open ? "Fechar" : "Abrir"}
            </WallActionButton>
          ) : !wall.locked ? (
            <WallActionButton onClick={() => onInteract(wall.open ? "close" : "open")}>
              {wall.open ? "Fechar" : "Abrir"}
            </WallActionButton>
          ) : wall.wallType === "door" ? (
            <WallActionButton onClick={() => onInteract("lockpick")}>
              Arrombar fechadura
            </WallActionButton>
          ) : null)}

        {/* Attack — available when destructible; terrain is scenery, not attackable */}
        {wall.wallType !== "terrain" && wall.maxHp > 0 && !wall.destroyed && (
          <WallActionButton onClick={onAttack}>Atacar</WallActionButton>
        )}

        <WallActionCancel onClick={onClose}>Cancelar</WallActionCancel>
      </WallActionMenu>
    </WallActionOverlay>
  );
}

const WallActionOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

const WallActionMenu = styled.div`
  background: ${colors.surfaceSidebar};
  border: 1px solid ${colors.grayMid};
  border-radius: 8px;
  padding: 16px;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const MasterActionBadge = styled.span`
  font-family: ${fonts.sans};
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${colors.brandAccent};
  background: rgba(255, 152, 0, 0.12);
  border: 1px solid ${colors.brandAccent};
  border-radius: 3px;
  padding: 2px 6px;
  align-self: flex-start;
`;

const WallActionTitle = styled.h3`
  font-family: ${fonts.display};
  font-size: 14px;
  color: ${colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 4px;
`;

const WallActionButton = styled.button`
  background: ${colors.brandPrimary};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 14px;
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  cursor: pointer;
  text-align: left;
  &:hover {
    opacity: 0.85;
  }
`;

const WallActionCancel = styled.button`
  background: transparent;
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 13px;
  border: 1px solid ${colors.grayMid};
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  margin-top: 4px;
  &:hover {
    background: ${colors.grayMid};
  }
`;

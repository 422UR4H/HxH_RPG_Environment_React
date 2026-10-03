import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import type { GridKind } from "../../../types/tacticalMap";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import { formatSlot } from "./combatText";
import { PanelHint } from "./panelStyles";
import {
  ButtonBase, Buttons, CancelButton, ConfirmButton, Dialog, DialogHint, DialogTitle, Overlay,
} from "./dialogStyles";

/** O que o mestre pediu no Arrumar e ainda não confirmou (F12). `characterId` é o da ficha. */
export type ArrangePending =
  | { kind: "move" | "place"; characterId: string; to: SlotTriple }
  | { kind: "remove"; characterId: string };

/**
 * A confirmação obrigatória do Arrumar: nada vai ao servidor antes dela, e nada muda no
 * tabuleiro depois dela até o `piece_moved`/`piece_removed` voltar.
 */
export default function ArrangeConfirmDialog({
  pending,
  nameOf,
  gridKind,
  canConfirm,
  onConfirm,
  onCancel,
}: {
  pending: ArrangePending | null;
  nameOf: (characterId: string) => string;
  gridKind: GridKind;
  /** Sem conexão o envio não sai: o diálogo fica aberto em vez de perder o pedido. */
  canConfirm: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  const name = nameOf(pending.characterId);
  const question =
    pending.kind === "remove"
      ? `Tirar ${name} do mapa?`
      : pending.kind === "move"
        ? `Mover ${name} para ${formatSlot(pending.to, gridKind)}?`
        : `Pôr ${name} em ${formatSlot(pending.to, gridKind)}?`;
  const Confirm = pending.kind === "remove" ? ConfirmButton : AccentConfirmButton;
  return (
    <Overlay onClick={onCancel}>
      <Dialog role="dialog" aria-modal aria-label="Arrumar o tabuleiro" onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Arrumar o tabuleiro</DialogTitle>
        <DialogHint>{question}</DialogHint>
        {!canConfirm && <PanelHint>Sem conexão com a mesa — confirme quando ela voltar.</PanelHint>}
        <Buttons>
          <CancelButton type="button" onClick={onCancel}>Cancelar</CancelButton>
          <Confirm type="button" onClick={onConfirm} disabled={!canConfirm}>Confirmar</Confirm>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

const AccentConfirmButton = styled(ButtonBase)`
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};
`;

import type { GridKind } from "../../../types/tacticalMap";
import type { DeclaredAction } from "./combatReducer";
import { describeDeclared } from "./combatText";
import { PanelHint } from "./panelStyles";
import {
  Buttons, CancelButton, ConfirmButton, Dialog, DialogHint, DialogTitle, Overlay,
} from "./dialogStyles";

/**
 * A confirmação de cancelar uma ação declarada. Nada muda aqui: a linha só some quando o
 * `action_cancelled` volta; se o servidor recusar (a ação abriu no meio-tempo), o banner de
 * erro fala e a linha segue o fluxo normal.
 */
export default function CancelDeclaredDialog({
  pending,
  nameOf,
  gridKind,
  showActor,
  showSwapCost,
  canConfirm,
  onConfirm,
  onKeep,
}: {
  pending: DeclaredAction | null;
  nameOf: (id: string) => string;
  gridKind: GridKind;
  /** O mestre declara por vários NPCs: o diálogo diz de quem é, como a linha. */
  showActor?: boolean;
  /**
   * Na corrida (Race) cancelar e refazer custa: até o fim da rodada o personagem rola a
   * velocidade com Desvantagem. Em Livre não há velocidade a rolar, então o aviso some.
   */
  showSwapCost?: boolean;
  /** Sem conexão o envio não sai: o diálogo fica aberto em vez de perder o pedido. */
  canConfirm: boolean;
  onConfirm: () => void;
  onKeep: () => void;
}) {
  if (!pending) return null;
  const what = `${showActor ? `${nameOf(pending.actorId)}: ` : ""}${describeDeclared(pending, nameOf, gridKind)}`;
  return (
    <Overlay onClick={onKeep}>
      <Dialog role="dialog" aria-modal aria-label="Cancelar ação" onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Cancelar esta ação?</DialogTitle>
        <DialogHint>{what}</DialogHint>
        <DialogHint>Ela sai da fila e não acontece.</DialogHint>
        {showSwapCost && (
          <DialogHint>Até o fim da rodada, o que este personagem fizer de novo rola a velocidade com Desvantagem.</DialogHint>
        )}
        {!canConfirm && <PanelHint>Sem conexão com a mesa — confirme quando ela voltar.</PanelHint>}
        <Buttons>
          <CancelButton type="button" onClick={onKeep}>Manter</CancelButton>
          <ConfirmButton type="button" onClick={onConfirm} disabled={!canConfirm}>Cancelar ação</ConfirmButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

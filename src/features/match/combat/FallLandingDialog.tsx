import type { GridKind } from "../../../types/tacticalMap";
import type { SlotTriple } from "../../tactical-map/utils/coords";
import { formatSlot } from "./combatText";
import { PanelHint } from "./panelStyles";
import {
  AccentConfirmButton, Buttons, CancelButton, Dialog, DialogHint, DialogTitle, Overlay,
} from "./dialogStyles";

/**
 * A confirmação de onde cai a fuga que falhou (F14). Confirmar não move nada: guarda a
 * escolha no turno, e a peça só vai para lá se, no fechamento, a fuga ainda estiver falhando.
 */
export default function FallLandingDialog({
  pending,
  name,
  gridKind,
  canConfirm,
  onConfirm,
  onCancel,
}: {
  pending: SlotTriple | null;
  /** Quem fugiu. */
  name: string;
  gridKind: GridKind;
  /** Sem conexão o envio não sai: o diálogo fica aberto em vez de perder a escolha. */
  canConfirm: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!pending) return null;
  return (
    <Overlay onClick={onCancel}>
      <Dialog role="dialog" aria-modal aria-label="Onde cai" onClick={(e) => e.stopPropagation()}>
        <DialogTitle>Onde cai</DialogTitle>
        <DialogHint>{`${name} cai em ${formatSlot(pending, gridKind)}?`}</DialogHint>
        <PanelHint>Vale se a fuga ainda falhar quando o turno fechar.</PanelHint>
        {!canConfirm && <PanelHint>Sem conexão com a mesa — confirme quando ela voltar.</PanelHint>}
        <Buttons>
          <CancelButton type="button" onClick={onCancel}>Cancelar</CancelButton>
          <AccentConfirmButton type="button" onClick={onConfirm} disabled={!canConfirm}>Confirmar</AccentConfirmButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

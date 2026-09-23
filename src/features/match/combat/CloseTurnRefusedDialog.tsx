import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { CloseTurnRefusedPayload } from "./combatMessages";

/**
 * A reação entra no cálculo de qualquer jeito — o que se perde ao fechar mesmo assim é só o
 * momento de narrar, não o efeito mecânico.
 */
export default function CloseTurnRefusedDialog({
  payload,
  nameOf,
  onConfirm,
  onCancel,
}: {
  payload: CloseTurnRefusedPayload | null;
  nameOf: (characterId: string) => string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!payload) return null;

  return (
    <Overlay onClick={onCancel}>
      <Dialog onClick={(e) => e.stopPropagation()}>
        <Message>
          A reação entra no cálculo de qualquer jeito. Fechar agora tira só a chance de narrar
          de:
        </Message>
        <List>
          {payload.pendingReactions.map((r) => (
            <Item key={r.reactionId}>
              {nameOf(r.actorId)} — {r.kind}
            </Item>
          ))}
        </List>
        <Buttons>
          <CancelButton onClick={onCancel}>Cancelar</CancelButton>
          <ConfirmButton onClick={onConfirm}>Fechar mesmo assim</ConfirmButton>
        </Buttons>
      </Dialog>
    </Overlay>
  );
}

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${colors.overlay};
`;

const Dialog = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 420px;
  width: 90%;
  padding: 24px;
  border-radius: 12px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
`;

const Message = styled.p`
  font-size: 15px;
  line-height: 1.5;
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-left: 16px;
`;

const Item = styled.li`
  font-size: 14px;
`;

const Buttons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

const ButtonBase = styled.button`
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  padding: 10px 18px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
`;

const CancelButton = styled(ButtonBase)`
  background: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

const ConfirmButton = styled(ButtonBase)`
  background: ${colors.dangerDark};
  color: ${colors.textPrimary};
`;

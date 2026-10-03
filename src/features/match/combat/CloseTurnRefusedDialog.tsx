import styled from "styled-components";
import { Buttons, CancelButton, ConfirmButton, Dialog, Overlay } from "./dialogStyles";
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

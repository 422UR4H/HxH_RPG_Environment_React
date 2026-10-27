import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import usePointerVerb from "../../../hooks/usePointerVerb";

/**
 * A escolha de uma casa no mapa (a casa da fuga, onde cai a fuga que falhou), no mesmo lugar da
 * dica do mapa — sem modal: o mapa continua à vista, com a casa escolhida desenhada como o destino
 * de um movimento. Antes do toque, a dica diz o que fazer; depois, a casa aparece e o Confirmar
 * envia. Tocar em outra casa troca a escolha.
 */
export default function MapPickConfirm({
  prompt,
  chosen,
  note,
  confirmLabel = "Confirmar",
  canConfirm = true,
  onConfirm,
}: {
  /** Antes da escolha: o que tocar. */
  prompt: string;
  /** Depois da escolha: o que vai acontecer ("Kurapika escapa para a casa marcada."). Ausente = ainda não escolheu. */
  chosen?: string;
  /** Uma linha a mais, depois da escolha (quando vale, o que acontece se não…). */
  note?: string;
  confirmLabel?: string;
  /** Sem conexão o envio não sai: o botão fica desabilitado, a escolha fica. */
  canConfirm?: boolean;
  onConfirm: () => void;
}) {
  const verb = usePointerVerb();
  if (!chosen) return <Bar role="status" $passive>{prompt}</Bar>;
  return (
    <Bar role="group" aria-label="Confirmar a casa escolhida">
      <Text>
        <strong>{chosen}</strong>
        {note && <span>{note}</span>}
        <span>{verb} em outra casa para trocar.</span>
      </Text>
      <ConfirmButton type="button" onClick={onConfirm} disabled={!canConfirm}>
        {confirmLabel}
      </ConfirmButton>
    </Bar>
  );
}

const Bar = styled.div<{ $passive?: boolean }>`
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  z-index: 29;
  max-width: calc(100% - 140px);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid ${colors.mapMoveIntent};
  background: ${colors.overlayMedium};
  color: ${colors.textPrimary};
  font-size: 12px;
  text-align: left;
  pointer-events: ${(p) => (p.$passive ? "none" : "auto")};
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    color: ${colors.textMuted};
  }
`;

const ConfirmButton = styled.button`
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: ${colors.mapMoveIntent};
  color: ${colors.textOnLight};
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

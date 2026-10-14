import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

// Aviso discreto no canto inferior esquerdo do mapa quando a imagem de fundo falha. O fundo é só
// experiência (não mecânica): o contêiner não bloqueia o mapa (pointer-events: none)
// e só o botão recebe clique. Fica embaixo à esquerda porque o topo é da faixa de turno/barras
// da mesa, o centro inferior é do MapHint e o canto inferior direito dos botões (Enquadrar).
export default function BgFailedNotice({ onRetry }: { onRetry: () => void }) {
  return (
    <Notice role="status">
      <span>Não foi possível carregar a imagem de fundo. O mapa funciona normalmente sem ela.</span>
      <RetryButton type="button" onClick={onRetry}>Tentar de novo</RetryButton>
    </Notice>
  );
}

const Notice = styled.div`
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 1;
  max-width: min(360px, calc(100% - 150px));
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  background: ${colors.overlayDark};
  border: 1px solid ${colors.grayMid};
  border-radius: 6px;
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
  pointer-events: none;
`;

const RetryButton = styled.button`
  flex-shrink: 0;
  padding: 4px 10px;
  background: ${colors.brandAccent};
  border: none;
  border-radius: 4px;
  color: ${colors.textPrimary};
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  pointer-events: auto;
`;

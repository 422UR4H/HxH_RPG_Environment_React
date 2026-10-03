import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

/** O canvas preenche o palco inteiro; barras e avisos flutuam por cima dele. */
export const CanvasWrapper = styled.div`
  position: absolute;
  inset: 0;
`;

export const MapLoadingMessage = styled.p`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 16px;
`;

export const NoMapMessage = styled(MapLoadingMessage)`
  color: ${colors.textDisabled};
`;

/**
 * A pilha de avisos sobre o mapa (erro do WS, declaradas perdidas): uma coluna abaixo da
 * barra geral, para um aviso que quebra em duas linhas empurrar o outro em vez de cobri-lo.
 * Não captura toque no vazio — o mapa embaixo continua tocável.
 */
export const StageNotices = styled.div`
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 50;
  width: min(92%, 520px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

/** Botão flutuante no canto do mapa (enquadrar). */
export const MapCornerButton = styled.button`
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 30;
  font-family: ${fonts.sans};
  font-size: 12px;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.overlayMedium};
  color: ${colors.textPrimary};
  cursor: pointer;
`;

/** Dica curta sobre o mapa: o que um toque vai fazer agora. */
export const MapHint = styled.p`
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  z-index: 29;
  max-width: calc(100% - 140px);
  margin: 0;
  padding: 6px 10px;
  border-radius: 8px;
  background: ${colors.overlayMedium};
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 12px;
  text-align: center;
  pointer-events: none;
`;

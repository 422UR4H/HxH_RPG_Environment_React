import styled, { css } from "styled-components";
import { colors } from "../../../styles/tokens";

// Botões flutuantes nos cantos do mapa, compartilhados pela mesa e pelo editor.

const cornerButton = css`
  font-size: 12px;
  font-weight: 600;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.overlayMedium};
  color: ${colors.textPrimary};
  cursor: pointer;
`;

/** Botão flutuante no canto do mapa (enquadrar). */
export const MapCornerButton = styled.button`
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 30;
  ${cornerButton}
`;

/**
 * Mais de um botão no canto (mestre: Arrumar e Enquadrar): empilhados no mesmo canto, para
 * a largura continuar a de um botão só — a `MapHint` do centro conta com isso.
 */
export const MapCornerStack = styled.div`
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 30;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
`;

/** Botão dentro de `MapCornerStack`; com `aria-pressed`, aceso enquanto o modo dura. */
export const MapCornerStackButton = styled.button`
  ${cornerButton}

  &[aria-pressed="true"] {
    border-color: ${colors.mapSelectionRing};
    background: ${colors.brandAccent};
  }
`;

import styled from "styled-components";
import { colors } from "../../../styles/tokens";

/** Título pequeno de seção dos painéis da partida. */
export const PanelTitle = styled.h3`
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: ${colors.textPlaceholderStrong};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

/** Explicação curta dentro de um painel ("o que fazer agora", "por que está vazio"). */
export const PanelHint = styled.p`
  margin: 0;
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
  font-style: italic;
`;

/** Um aviso sozinho ocupando o painel. */
export const PanelMessage = styled(PanelHint)`
  padding: 16px 12px;
  font-size: 13px;
`;

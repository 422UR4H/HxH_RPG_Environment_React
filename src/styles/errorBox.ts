import { css } from "styled-components";
import { colors, alpha } from "./tokens";

/** Caixa de erro de formulário, no padrão do aviso do BackgroundEditorModal: fundo, borda de 1px e
 *  texto na cor da borda. O fundo escuro (base `overlayDark` + tinta de perigo) é o que mantém o
 *  texto legível sobre a textura clara do mapa das páginas de campanha e partida. */
export const errorBox = css`
  box-sizing: border-box;
  padding: 10px 14px;
  border: 1px solid ${colors.feedbackDanger};
  border-radius: 6px;
  background-color: ${colors.overlayDark};
  background-image: linear-gradient(
    ${alpha(colors.feedbackDanger, 0.12)},
    ${alpha(colors.feedbackDanger, 0.12)}
  );
  color: ${colors.feedbackDanger};
  font-weight: 600;
  line-height: 1.35;
`;

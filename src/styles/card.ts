import { css } from "styled-components";
import { colors } from "./tokens";

/** O card do site: moldura, sombra e hover do card de campanha. Campanha, partida e mapa usam este
 *  mesmo trecho; cada um acrescenta só o que é seu (padding, layout interno, largura). O fundo não
 *  muda no hover: quem reage é a borda, a sombra e a subida. */
export const cardSurface = css`
  background-color: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 4px solid ${colors.borderInput};
  border-radius: 12px;
  box-shadow: 0 4px 6px ${colors.shadowSoft};
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px ${colors.shadowStrong};
    border-color: ${colors.brandAccent};
  }
  &:active {
    transform: scale(0.98);
  }
`;

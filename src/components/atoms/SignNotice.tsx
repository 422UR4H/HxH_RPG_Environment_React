import styled, { css } from "styled-components";
import { colors, alpha } from "../../styles/tokens";

interface SignNoticeProps {
  message: string;
  // "light": cartão claro do login/cadastro. "dark": avisos sobre o fundo escuro do app.
  tone?: "light" | "dark";
}

// Aviso neutro (conta criada, sessão expirada, lobby fechado): borda à esquerda na cor de destaque
// da superfície, sem cara de erro. No cartão claro tem a mesma coluna e o mesmo recuo do SignFormError.
export default function SignNotice({ message, tone = "light" }: SignNoticeProps) {
  return (
    <StyledSignNotice role="status" $tone={tone}>
      {message}
    </StyledSignNotice>
  );
}

const lightTone = css`
  width: 429px;
  border-left: 4px solid ${colors.actionHighlightOnLight};
  background-color: ${alpha(colors.actionHighlightOnLight, 0.08)};
  font-size: min(18px, 4.6vw);
  color: ${colors.textOnLight};

  @media (max-width: 580px) {
    width: 100%;
  }
`;

const darkTone = css`
  width: 100%;
  margin-bottom: 20px;
  border-left: 4px solid ${colors.actionHighlight};
  /* O fundo do app é a textura clara do mapa: sem a base escura o branco ficava em 3,8:1. */
  background-color: ${colors.overlayDark};
  background-image: linear-gradient(${alpha(colors.actionHighlight, 0.16)}, ${alpha(colors.actionHighlight, 0.16)});
  font-size: 16px;
  color: ${colors.textPrimary};
`;

const StyledSignNotice = styled.div<{ $tone: "light" | "dark" }>`
  box-sizing: border-box;
  padding: 10px 14px;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  ${({ $tone }) => ($tone === "dark" ? darkTone : lightTone)}
`;

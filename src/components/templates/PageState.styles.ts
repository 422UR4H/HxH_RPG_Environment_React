import { Link } from "react-router-dom";
import styled, { css, keyframes } from "styled-components";
import spaceImage from "../../assets/images/space.png";
import worldImage from "../../assets/images/worldmap.png";
import { alpha, colors, fonts } from "../../styles/tokens";

export type Family = "world" | "sheet";

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Shell = styled.div`
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  font-family: ${fonts.sans};
  /* O reset global põe a fonte em todo elemento (TIP-01), o que anula a herança daqui.
     Sai quando o reset passar a declarar a fonte só no body (PR 2 da fase 2). */
  & * {
    font-family: ${fonts.sans};
  }
`;

// A cor de base fica sob a imagem: se ela falhar, o texto continua legível.
export const Stage = styled.main<{ $family: Family }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background-color: ${({ $family }) =>
    $family === "world" ? colors.surfaceSidebar : colors.surfaceHeaderDark};
  background-image: url(${({ $family }) => ($family === "world" ? worldImage : spaceImage)});
  background-size: cover;
  background-position: center;
`;

export const Card = styled.div<{ $family: Family }>`
  box-sizing: border-box;
  width: 100%;
  max-width: 460px;
  padding: 24px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 28px ${colors.shadowStrong};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
  color: ${colors.textPrimary};
  ${({ $family }) =>
    $family === "world"
      ? css`
          background: ${alpha(colors.surfaceSidebar, 0.94)};
          border: 1px solid ${colors.borderInput};
        `
      : css`
          background: ${alpha(colors.surfaceHeaderDark, 0.72)};
          border: 1px solid ${colors.surfaceControl};
        `}

  @media (min-width: 480px) {
    padding: 32px 36px;
  }
`;

export const Spinner = styled.div`
  width: 40px;
  height: 40px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 4px solid ${colors.overlayHighlight};
  border-top-color: ${colors.feedbackProgress};
  animation: ${spin} 0.9s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

export const Label = styled.p`
  margin: 0;
  font-size: 20px;
  font-weight: 500;
`;

export const Hint = styled.p`
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  color: ${colors.textMuted};
`;

export const Title = styled.h1<{ $color: string }>`
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: ${({ $color }) => $color};
`;

export const Message = styled.p`
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  color: ${colors.textMuted};
`;

export const Actions = styled.div`
  display: flex;
  flex-direction: column;
  align-self: stretch;
  gap: 12px;

  @media (min-width: 480px) {
    flex-direction: row;
    align-self: center;
  }
`;

const actionBase = css`
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 20px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  color: ${colors.textPrimary};

  &:focus-visible {
    outline: 2px solid ${colors.actionHighlight};
    outline-offset: 3px;
  }
`;

const primary = css`
  ${actionBase}
  background: ${colors.brandAccent};
  border: 1px solid ${colors.brandAccent};
`;

const secondary = css`
  ${actionBase}
  background: transparent;
  border: 1px solid ${alpha(colors.textPrimary, 0.45)};
`;

export const PrimaryButton = styled.button`
  ${primary}
`;
export const PrimaryLink = styled(Link)`
  ${primary}
`;
export const SecondaryLink = styled(Link)`
  ${secondary}
`;

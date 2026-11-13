import styled, { css } from "styled-components";
import space from "../../assets/images/space.png";
import questionIcon from "../../assets/icons/questionmark-sm.svg";
import CloseButton from "../../components/ions/CloseButton";
import { colors } from "../../styles/tokens";
import { errorBox } from "../../styles/errorBox";
import { iconButtonFx } from "../../styles/iconButtonFx";

// Variante B do Claude Design (docs/audits/2026-11-11-briefing-regras-da-ficha/claude-design/
// B1–B4 e shared/regras.css), com as cores trocadas pelos tokens do site.

type Docked = { $docked: boolean };

const HEADER_HEIGHT = 52;
// Acima do conteúdo da ficha; o diálogo também cobre o header da página.
const DOCKED_Z = 150;
const DIALOG_Z = 300;

// A largura vem do componente (RULES_PANEL_WIDTH), que é quem a exporta para a ficha.
export const Panel = styled.div<Docked & { $width: string }>`
  position: fixed;
  top: 0;
  bottom: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /* A cor de base fica sob a imagem: se ela falhar, o texto continua legível. */
  background-color: ${colors.surfaceHeaderDark};
  background-image: url(${space});
  background-size: 100% auto;
  background-position: center top;
  color: ${colors.textPrimary};

  ${({ $docked, $width }) =>
    $docked
      ? css`
          z-index: ${DOCKED_Z};
          width: ${$width};
          border-left: 1px solid ${colors.borderFloating};
          box-shadow: -12px 0 32px ${colors.shadowFloating};
        `
      : css`
          z-index: ${DIALOG_Z};
          left: 0;
        `}
`;

export const Header = styled.header`
  flex: 0 0 auto;
  position: relative;
  height: ${HEADER_HEIGHT}px;
  box-sizing: border-box;
  padding: 0 76px 0 20px;
  display: flex;
  align-items: center;
  background: ${colors.surfaceHeaderDark};
  border-bottom: 1px solid ${colors.borderMuted};
`;

export const Title = styled.h2`
  margin: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  line-height: 28px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${colors.textPrimary};
  white-space: nowrap;
`;

export const TitleIcon = styled.img.attrs({ src: questionIcon, alt: "" })`
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
`;

export const TitleText = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const TitleSub = styled.span`
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  letter-spacing: 0;
  text-transform: none;
  color: ${colors.textLabelMuted};
`;

// O X vaza do header para dentro do conteúdo, como nas partidas e campanhas.
export const CloseX = styled.button`
  position: absolute;
  z-index: 2;
  top: 4px;
  right: 12px;
  padding: 0;
  border: none;
  background: none;
  line-height: 0;
  cursor: pointer;
  border-radius: 50%;
  ${iconButtonFx(1.06)}

  &:focus-visible {
    outline: 2px solid ${colors.actionHighlight};
    outline-offset: 3px;
  }
`;

export const XIcon = styled(CloseButton).attrs({ alt: "" })<Docked>`
  width: ${({ $docked }) => ($docked ? 56 : 50)}px;
  height: ${({ $docked }) => ($docked ? 56 : 50)}px;
  opacity: 1;
  filter: drop-shadow(0 2px 4px ${colors.shadowStrong});
`;

// A folha escura em que se lê, como o painel PERÍCIAS da ficha.
export const Body = styled.div<Docked>`
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: ${colors.surfaceMuted};
  box-shadow: 0 8px 24px ${colors.shadowStrong};
  overflow: hidden;
  margin: ${({ $docked }) => ($docked ? "16px 16px 0" : "0 12px")};
  border-radius: ${({ $docked }) => ($docked ? "6px 6px 0 0" : "0")};
`;

export const Chips = styled.nav<Docked & { $rows: boolean }>`
  flex: 0 0 auto;
  /* Referência do offsetLeft dos chips (rolagem até o ativo no celular). */
  position: relative;
  border-bottom: 1px solid ${colors.borderMuted};

  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  ${({ $docked, $rows }) =>
    $docked
      ? css`
          padding: 14px 16px;
          ol {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
          }
          ${$rows &&
          css`
            /* Contagem que não é múltiplo de 3: fileiras de larguras livres, cada uma cheia. */
            ol {
              display: flex;
              flex-wrap: wrap;
              gap: 0 8px;
              margin-bottom: -8px;
            }
            li {
              flex: 1 1 auto;
              display: flex;
              margin-bottom: 8px;
            }
            a {
              flex: 1 1 auto;
              flex-wrap: nowrap;
              white-space: nowrap;
            }
          `}
        `
      : css`
          /* Celular: uma fileira que rola sozinha; a página nunca rola na horizontal. */
          padding: 10px 12px;
          overflow-x: auto;
          scrollbar-width: none;
          ol {
            display: flex;
            gap: 8px;
            width: max-content;
          }
          a {
            min-height: 44px;
            white-space: nowrap;
          }
        `}
`;

/** Quebra de fileira: um item vazio de 100% de largura, fora da árvore de acessibilidade. */
export const ChipBreak = styled.li`
  flex: 0 0 100%;
  height: 0;
  margin: 0 !important;
`;

export const Chip = styled.a`
  box-sizing: border-box;
  height: 100%;
  min-height: 34px;
  padding: 5px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px 6px;
  text-align: center;
  border: 1px solid ${colors.borderStrong};
  border-radius: 999px;
  color: ${colors.textMuted};
  text-decoration: none;
  font-size: 14px;
  line-height: 20px;

  &:hover {
    background: ${colors.overlayHighlightFaint};
  }

  &[aria-current] {
    background: ${colors.surfaceControl};
    border-color: ${colors.actionCurrent};
    box-shadow: inset 0 0 0 1px ${colors.actionCurrent};
    color: ${colors.textPrimary};
    font-weight: 700;
  }

  &:focus-visible {
    outline: 2px solid ${colors.actionHighlight};
    outline-offset: 3px;
  }
`;

export const Reading = styled.div<Docked>`
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: ${({ $docked }) => ($docked ? "24px 28px 48px" : "24px 18px 48px")};
`;

export const ChapterSection = styled.section`
  & + & {
    margin-top: 64px;
  }
  scroll-margin-top: 16px;
`;

export const ChapterTitle = styled.h2<Docked>`
  margin: 0 0 16px;
  padding-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  /* O "##" do corpo já usa o visual de h2 do design (26px); o título do capítulo sobe um
     degrau para a hierarquia continuar legível. */
  border-bottom: 2px solid ${colors.borderStrong};
  font-size: ${({ $docked }) => ($docked ? 30 : 25)}px;
  line-height: ${({ $docked }) => ($docked ? 36 : 30)}px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: ${colors.textPrimary};
`;

export const Loading = styled.div`
  display: flex;
  justify-content: center;
  padding: 48px 0;
`;

export const ErrorBox = styled.div`
  ${errorBox}
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;

  p {
    margin: 0;
  }
`;

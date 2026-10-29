import { css } from "styled-components";

// Altura da barra de botões da coluna central (BottomActions/AdaptiveActionButton) e o quanto ela
// sobe do rodapé. Definidas uma vez no corpo da página para a barra, o respiro do fim da lista e
// as abas laterais lerem o mesmo número. Se a barra mudar de altura, mude aqui.
export const bottomBarVars = css`
  --bottom-bar-height: 91px;
  --bottom-bar-offset: 22px;

  @media (max-width: 440px) {
    --bottom-bar-height: 70px;
  }
`;

/** Espaço que a barra ocupa no rodapé da coluna: altura + distância do fundo. */
export const bottomBarSpace = "calc(var(--bottom-bar-height, 91px) + var(--bottom-bar-offset, 22px))";

/** Respiro no fim da lista: a barra inteira mais 24 px, para o último card nunca ficar escondido. */
export const bottomBarReserve = `calc(${bottomBarSpace} + 24px)`;

/** Elevação dos botões flutuantes (CON-06). No fundo escuro sombra preta quase não aparece:
 *  quem separa é o aro claro e o brilho de 1 px no topo, com uma sombra mais larga. */
export const floatingElevation = (shadow: string, outline: string, highlight: string) =>
  `0 3px 6px ${shadow}, 0 16px 40px ${shadow}, 0 0 0 1px ${outline}, inset 0 1px 0 ${highlight}`;

/** Distância do fundo da tela dos botões flutuantes (BottomActions e AdaptiveActionButton). */
export const floatingBottomPx = 20;
/** Altura medida dos botões flutuantes (padding 15 + texto 26): se o botão mudar de tamanho, mude aqui. */
export const floatingHeightPx = 72;
/** Altura do "Gerenciar" flutuante ao lado do botão principal (72 px): maior que o botão antigo de
 *  44 px, mas menor que o principal, por ser a ação de menor relevância. */
export const manageFloatingHeightPx = 58;
/** A barra só encaixa a 30 px do fim do conteúdo; até lá ela flutua (mesmo número dos dois componentes). */
export const dockThresholdPx = 30;
const floatingSafetyPx = 8;

/** Folga mínima entre o fim do conteúdo e o último item para o botão flutuante não cobrir o card
 *  pouco antes de encaixar: os px que faltam para encaixar + o quanto ele sobe do fundo + a altura dele + a margem de segurança. */
const floatingClearance = `${dockThresholdPx + floatingBottomPx + floatingHeightPx + floatingSafetyPx}px`;

/** Fim de lista em que a barra encaixada fica a exatamente `gap` do último item (o gap da própria
 *  lista). O fim do conteúdo fica sempre a `floatingClearance` do último item; quem se ajusta é o
 *  `bottom` da barra encaixada, então o desenho encaixado não muda. `--bottom-bar-offset` serve ao
 *  BottomActions; `--docked-bar-bottom` ao AdaptiveActionButton, que fora deste bloco (Criar NPC na
 *  sidebar) continua com `bottom: 0`. */
export const dockedBarAfterGap = (gap: string) => `
  --docked-bar-bottom: calc(${floatingClearance} - var(--bottom-bar-height, 91px) - ${gap});
  --bottom-bar-offset: var(--docked-bar-bottom);
  padding-bottom: ${floatingClearance};
`;

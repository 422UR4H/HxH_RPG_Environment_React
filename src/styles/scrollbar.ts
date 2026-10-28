import { css } from "styled-components";
import { colors } from "./tokens";

export interface ScrollbarPalette {
  track: string;
  thumb: string;
  thumbHover: string;
  /** Anel entre polegar e trilho; também pinta o canto onde as duas barras se cruzam. */
  thumbBorder: string;
}

export const scrollbarPalettes = {
  /** Padrão global: telas escuras (fichas, espaço). */
  dark: {
    track: colors.surfaceDeep,
    thumb: colors.surfaceScrollThumbAccent,
    thumbHover: colors.surfaceScrollThumbAccentHover,
    thumbBorder: colors.surfaceDeep,
  },
  /** Telas de campanha/partida: os marrons dos painéis sobre o mapa-múndi. */
  earth: {
    track: colors.surfaceScrollTrack,
    thumb: colors.surfaceInput,
    thumbHover: colors.surfaceScrollThumbHover,
    thumbBorder: colors.surfaceSidebar,
  },
} as const satisfies Record<string, ScrollbarPalette>;

function webkitRules(scopes: string[], p: ScrollbarPalette) {
  const on = (pseudo: string) => scopes.map((s) => `${s}${pseudo}`).join(", ");
  return css`
    ${on("::-webkit-scrollbar")} {
      width: 12px;
      height: 12px;
    }
    ${on("::-webkit-scrollbar-track")} {
      background: ${p.track};
    }
    ${on("::-webkit-scrollbar-thumb")} {
      background: ${p.thumb};
      border-radius: 6px;
      border: 2px solid ${p.thumbBorder};
    }
    ${on("::-webkit-scrollbar-thumb:hover")} {
      background: ${p.thumbHover};
    }
    ${on("::-webkit-scrollbar-corner")} {
      background: ${p.thumbBorder};
    }
  `;
}

// O `scrollbar-color` padrão fica só para quem não tem os pseudo-elementos (Firefox): no
// Chromium ≥121 ele, quando presente, desliga o `::-webkit-scrollbar` do elemento — e com
// ele o polegar arredondado com anel.

/** Para o `ResetStyle`: vale para todo elemento rolável da aplicação. */
export const globalScrollbar = (p: ScrollbarPalette) => css`
  ${webkitRules(["*"], p)}
  @supports not selector(::-webkit-scrollbar) {
    :root {
      scrollbar-color: ${p.thumb} ${p.track};
    }
  }
`;

/** Para um container: troca a paleta dele e de tudo que rola dentro dele. */
export const scopedScrollbar = (p: ScrollbarPalette) => css`
  ${webkitRules(["&", "& *"], p)}
  @supports not selector(::-webkit-scrollbar) {
    scrollbar-color: ${p.thumb} ${p.track};
  }
`;

/**
 * Para páginas cuja rolagem é a da janela: a barra do viewport pertence ao `html`, que um
 * container não alcança. Use dentro de `createGlobalStyle`, montado só enquanto a página existe;
 * o seletor `html` vence o `*` do `globalScrollbar`; no fallback do Firefox, `html:root` empata
 * em especificidade com o `:root` do `globalScrollbar` e, vindo depois, vence.
 */
export const viewportScrollbar = (p: ScrollbarPalette) => css`
  ${webkitRules(["html", "html *"], p)}
  @supports not selector(::-webkit-scrollbar) {
    html:root {
      scrollbar-color: ${p.thumb} ${p.track};
    }
  }
`;

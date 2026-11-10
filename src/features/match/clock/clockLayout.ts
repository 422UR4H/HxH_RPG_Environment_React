/**
 * Geometria da pílula do relógio no topo do palco. Fica num arquivo próprio (sem componente)
 * para a barra geral e a pilha de avisos descerem para baixo dela sem importar a pílula.
 */

/**
 * A barra geral fica na primeira linha do palco e a pílula logo abaixo dela. A altura da barra
 * muda (a faixa de barras abre e fecha), então a barra publica a própria altura nesta variável
 * CSS do palco e a pílula, o painel e os avisos descem a partir dela.
 */
export const GENERAL_BAR_HEIGHT_VAR = "--general-bar-h";
/** Altura da barra geral fechada, usada até a primeira medição. */
const GENERAL_BAR_FALLBACK = 36;
/** Altura da pílula (px): também o alvo mínimo de toque do botão do mestre. */
export const CLOCK_PILL_HEIGHT = 40;
/** Topo da pílula: 8 px da barra geral, que fica a 8 px do topo do palco. */
export const CLOCK_PILL_TOP_CSS = `calc(16px + var(${GENERAL_BAR_HEIGHT_VAR}, ${GENERAL_BAR_FALLBACK}px))`;
/** Base da pílula: quem fica embaixo dela soma o próprio respiro. */
export const CLOCK_PILL_BOTTOM_CSS = `calc(16px + var(${GENERAL_BAR_HEIGHT_VAR}, ${GENERAL_BAR_FALLBACK}px) + ${CLOCK_PILL_HEIGHT}px)`;

/**
 * Acima do mapa e da barra geral (30) — o painel do mestre ancora embaixo da pílula —, abaixo
 * dos avisos do palco (50) e dos véus/gaveta (55/60, ver MatchStageTemplate).
 */
export const CLOCK_PILL_Z_INDEX = 40;

/**
 * O painel do relógio do mestre: acima dos avisos do palco (50) — aberto, ele não pode ficar
 * embaixo de um aviso —, abaixo dos véus (55) e da gaveta (60). Ver MatchStageTemplate.
 */
export const CLOCK_PANEL_Z_INDEX = 52;

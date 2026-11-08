/**
 * Geometria da pílula do relógio no topo do palco. Fica num arquivo próprio (sem componente)
 * para a barra geral e a pilha de avisos descerem para baixo dela sem importar a pílula.
 */

/** Distância da pílula ao topo do palco (px). */
export const CLOCK_PILL_TOP = 8;
/** Altura da pílula (px): também o alvo mínimo de toque do botão do mestre. */
export const CLOCK_PILL_HEIGHT = 40;
/**
 * Quanto o que flutuava no topo do palco desce para deixar a pílula à vista: o topo dela + a
 * altura. Quem fica embaixo soma o próprio respiro.
 */
export const CLOCK_PILL_OFFSET = CLOCK_PILL_TOP + CLOCK_PILL_HEIGHT;

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

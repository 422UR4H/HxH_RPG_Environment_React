// Caixa do canvas na tela: posição (de `getBoundingClientRect`) e tamanho.
export interface CanvasBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ResizeShift {
  dx: number;
  dy: number;
  refit: boolean;
}

// Regra do dono: abrir ou fechar uma coluna lateral (Histórico à direita, ficha/coluna à
// esquerda) não mexe no mapa. Mudança só de largura e/ou de posição devolve o quanto a borda
// do canvas andou; somar `dx`/`dy` a `vp.x`/`vp.y` deixa cada ponto do mundo no mesmo pixel da
// tela. Mudança de altura (painel de baixo do celular, girar o aparelho) continua pedindo
// reenquadrar, como antes. A primeira medida também reenquadra: não há caixa anterior.
export function resizeShift(prev: CanvasBox | null, next: CanvasBox): ResizeShift {
  if (prev === null || prev.height !== next.height) return { dx: 0, dy: 0, refit: true };
  return { dx: prev.left - next.left, dy: prev.top - next.top, refit: false };
}

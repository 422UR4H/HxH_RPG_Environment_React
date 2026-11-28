// Caixa do canvas na tela: posição (de `getBoundingClientRect`) e tamanho, mais a largura da
// janela (`window.innerWidth`) no momento da medida.
export interface CanvasBox {
  left: number;
  top: number;
  width: number;
  height: number;
  viewportWidth: number;
}

export interface ResizeShift {
  dx: number;
  dy: number;
  refit: boolean;
}

// Regra do dono: abrir ou fechar uma coluna lateral (Histórico à direita, ficha/coluna à
// esquerda) não mexe no mapa. Com a janela do mesmo tamanho, mudança só de largura e/ou de
// posição do canvas devolve o quanto a borda andou; somar `dx`/`dy` a `vp.x`/`vp.y` deixa cada
// ponto do mundo no mesmo pixel da tela. Reenquadra, como antes:
// - na primeira medida (não há caixa anterior);
// - quando a altura do canvas muda (painel de baixo do celular, girar o aparelho);
// - quando a LARGURA DA JANELA muda (janela encolhida, DevTools acoplado ao lado): aí não foi
//   uma coluna, e um mapa parado podia ficar fora da tela.
// Diferença abaixo de 1 px (arredondamento do ResizeObserver, zoom da página) não conta.
const TOLERANCE_PX = 1;

const changed = (a: number, b: number) => Math.abs(a - b) >= TOLERANCE_PX;

export function resizeShift(prev: CanvasBox | null, next: CanvasBox): ResizeShift {
  if (prev === null || changed(prev.height, next.height) || changed(prev.viewportWidth, next.viewportWidth)) {
    return { dx: 0, dy: 0, refit: true };
  }
  return { dx: prev.left - next.left, dy: prev.top - next.top, refit: false };
}

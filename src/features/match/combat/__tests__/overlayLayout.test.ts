import { describe, it, expect } from "vitest";
import { stackAbove } from "../overlayLayout";

const box = (key: string, x: number, y: number, w = 40, h = 20) => ({ key, x, y, w, h });

describe("stackAbove", () => {
  it("lista vazia: nada a deslocar", () => {
    expect(stackAbove([])).toEqual({});
  });

  it("sem sobreposição, ninguém se mexe", () => {
    expect(stackAbove([box("a", 0, 100), box("b", 100, 100), box("c", 0, 0)])).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("encostar não é sobrepor: lado a lado e um logo acima do outro ficam onde estão", () => {
    expect(stackAbove([box("a", 0, 100), box("b", 40, 100), box("c", 0, 80)])).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("dois sobrepostos: o de baixo fica, o outro sobe só o bastante, mais o vão", () => {
    // b começa 5px acima de a: o fundo dele (115) tem de ir para o topo de a (100) − vão (4).
    const offsets = stackAbove([box("a", 0, 100), box("b", 10, 95)]);
    expect(offsets).toEqual({ a: 0, b: -19 });
  });

  it("o vão é configurável", () => {
    expect(stackAbove([box("a", 0, 100), box("b", 0, 100)], 0)).toEqual({ a: 0, b: -20 });
  });

  it("três na mesma âncora viram uma coluna", () => {
    const offsets = stackAbove([box("a", 0, 100), box("b", 0, 100), box("c", 0, 100)]);
    expect(offsets).toEqual({ a: 0, b: -24, c: -48 });
  });

  it("a ordem de entrada não importa: o mais baixo fica, empate desempata pelo x", () => {
    const offsets = stackAbove([box("top", 0, 90), box("right", 20, 100), box("left", 0, 100)]);
    // left (y 100, x 0) fica; right sobe acima de left; top (y 90) sobe acima dos dois.
    expect(offsets).toEqual({ left: 0, right: -24, top: -38 });
  });

  it("subir para fugir de um pode cair noutro já empilhado: sobe de novo até achar lugar", () => {
    // a fica; b sobe para 76. c (95) foge de a para 76 — em cima de b — e sobe outra vez: 52.
    const offsets = stackAbove([box("a", 0, 100), box("b", 0, 100), box("c", 0, 95)]);
    expect(offsets).toEqual({ a: 0, b: -24, c: -43 });
  });

  it("quem subiu pode empurrar um item que antes estava livre, mais acima", () => {
    // b (70..90) não sobrepõe a (100..120) de saída; depois que a foge de c, passa a sobrepor.
    const offsets = stackAbove([box("a", 0, 100), box("b", 30, 70, 40, 20), box("c", 10, 105)]);
    // c (y 105) é o mais baixo: fica. a sobe para 105 − 4 − 20 = 81 (−19).
    // b (70..90) sobrepõe a nova posição de a (81..101): sobe para 81 − 4 − 20 = 57 (−13).
    expect(offsets).toEqual({ c: 0, a: -19, b: -13 });
  });

  it("um item longe na horizontal não é empurrado por uma pilha alheia", () => {
    const offsets = stackAbove([box("a", 0, 100), box("b", 0, 100), box("far", 300, 100)]);
    expect(offsets.far).toBe(0);
    expect(offsets.b).toBe(-24);
  });

  it("caixa sem tamanho (ainda não medida) nunca sobrepõe", () => {
    expect(stackAbove([box("a", 0, 100, 0, 0), box("b", 0, 100, 0, 0)])).toEqual({ a: 0, b: 0 });
  });
});

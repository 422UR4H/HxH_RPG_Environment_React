import { describe, expect, it } from "vitest";
import { lerCssReset as lerCss } from "../../test/lerCssReset";
import { colors } from "../tokens";

// Extrai a regra inteira (seletor + bloco) do anel: a que contém o :where( com :focus-visible.
const regraDoAnel = (css: string) => {
  const ini = css.indexOf(":where(:not(input,textarea,select):focus-visible");
  const fim = css.indexOf("}", ini);
  return ini < 0 ? "" : css.slice(ini, fim + 1);
};

describe("anel de foco global", () => {
  it("define --focus-ring no :root", () => {
    expect(lerCss()).toContain(`:root{--focus-ring:${colors.actionHighlight};}`);
  });

  it("anel global com especificidade zero", () => {
    const regra = regraDoAnel(lerCss());
    expect(regra).not.toBe("");
    // Acha o ")" que fecha o :where e confere que não sobra :focus-visible depois dele.
    let nivel = 0;
    let fecha = -1;
    for (let i = ":where".length; i < regra.length; i++) {
      if (regra[i] === "(") nivel++;
      if (regra[i] === ")" && --nivel === 0) {
        fecha = i;
        break;
      }
    }
    const dentro = regra.slice(0, fecha + 1);
    const depois = regra.slice(fecha + 1);
    expect(dentro).toContain(":focus-visible");
    expect(depois).not.toContain(":focus-visible");
    expect(depois).toBe("{outline:2pxsolidvar(--focus-ring);outline-offset:3px;}");
  });

  it("campos de texto ficam fora do anel", () => {
    const css = lerCss();
    const seletor = regraDoAnel(css);
    expect(seletor).toContain(":not(input,textarea,select)");
    expect(seletor).toContain('[type="checkbox"]');
    expect(seletor).toContain('[type="radio"]');
    expect(seletor).toContain('[type="range"]');
  });

  it("inclui input color", () => {
    expect(regraDoAnel(lerCss())).toContain('[type="color"]');
  });
});

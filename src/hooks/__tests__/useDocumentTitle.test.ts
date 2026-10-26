import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import useDocumentTitle from "../useDocumentTitle";

describe("useDocumentTitle", () => {
  it("junta as partes e o nome do produto", () => {
    renderHook(() => useDocumentTitle("Mesa", "O Grande Início"));
    expect(document.title).toBe("Mesa · O Grande Início · System X System");
  });

  it("ignora partes vazias", () => {
    renderHook(() => useDocumentTitle("Mesa", undefined));
    expect(document.title).toBe("Mesa · System X System");
    renderHook(() => useDocumentTitle());
    expect(document.title).toBe("System X System");
  });

  it("atualiza quando o nome chega", () => {
    const { rerender } = renderHook(
      ({ nome }: { nome?: string }) => useDocumentTitle("Mesa", nome),
      { initialProps: { nome: undefined as string | undefined } },
    );
    expect(document.title).toBe("Mesa · System X System");
    rerender({ nome: "Arena" });
    expect(document.title).toBe("Mesa · Arena · System X System");
  });

  it("volta ao nome do produto ao desmontar", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Mesa"));
    unmount();
    expect(document.title).toBe("System X System");
  });
});

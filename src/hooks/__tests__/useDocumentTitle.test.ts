import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import useDocumentTitle from "../useDocumentTitle";

describe("useDocumentTitle", () => {
  it("joins the parts and the product name", () => {
    renderHook(() => useDocumentTitle("Mesa", "O Grande Início"));
    expect(document.title).toBe("Mesa · O Grande Início · System X System");
  });

  it("ignores empty parts", () => {
    renderHook(() => useDocumentTitle("Mesa", undefined));
    expect(document.title).toBe("Mesa · System X System");
    renderHook(() => useDocumentTitle());
    expect(document.title).toBe("System X System");
  });

  it("updates when the name arrives", () => {
    const { rerender } = renderHook(
      ({ nome }: { nome?: string }) => useDocumentTitle("Mesa", nome),
      { initialProps: { nome: undefined as string | undefined } },
    );
    expect(document.title).toBe("Mesa · System X System");
    rerender({ nome: "Arena" });
    expect(document.title).toBe("Mesa · Arena · System X System");
  });

  it("goes back to the product name on unmount", () => {
    const { unmount } = renderHook(() => useDocumentTitle("Mesa"));
    unmount();
    expect(document.title).toBe("System X System");
  });
});

import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useFieldValidation from "../useFieldValidation";

type Values = { title: string; link: string };

function setup(values: Values, locked = false) {
  return renderHook(
    ({ v }: { v: Values }) =>
      useFieldValidation({
        title: { value: v.title, required: true, min: 5, minMessage: "curto", max: 8 },
        link: { value: v.link, max: 3, disabled: locked },
      }),
    { initialProps: { v: values } },
  );
}

describe("useFieldValidation", () => {
  it("hides errors until the field is touched, then revalidates on change", () => {
    const { result, rerender } = setup({ title: "", link: "" });
    expect(result.current.errorFor("title")).toBeNull();
    act(() => result.current.touch("title"));
    expect(result.current.errorFor("title")).toBe("Campo obrigatório.");
    rerender({ v: { title: "ab", link: "" } });
    expect(result.current.errorFor("title")).toBe("curto");
    rerender({ v: { title: "abcde", link: "" } });
    expect(result.current.errorFor("title")).toBeNull();
  });

  it("treats whitespace as empty and skips the minimum on an optional empty field", () => {
    const { result } = setup({ title: "   ", link: "" });
    act(() => {
      result.current.touch("title");
      result.current.touch("link");
    });
    expect(result.current.errorFor("title")).toBe("Campo obrigatório.");
    expect(result.current.errorFor("link")).toBeNull();
  });

  it("shows the limit note at the max, counting characters", () => {
    const { result, rerender } = setup({ title: "ab", link: "" });
    expect(result.current.noticeFor("title")).toBeNull();
    rerender({ v: { title: "ãããããããã", link: "" } });
    expect(result.current.noticeFor("title")).toBe("Limite de 8 caracteres atingido.");
    rerender({ v: { title: "😀😀😀😀😀😀😀", link: "" } });
    expect(result.current.noticeFor("title")).toBeNull();
  });

  it("validateAll touches everything and returns the first invalid field in rule order", () => {
    const { result } = setup({ title: "", link: "" });
    let first: string | null = null;
    act(() => {
      first = result.current.validateAll();
    });
    expect(first).toBe("title");
    expect(result.current.errorFor("title")).toBe("Campo obrigatório.");
  });

  it("returns null when everything is valid and ignores disabled rules", () => {
    const { result } = setup({ title: "abcde", link: "" }, true);
    let first: string | null = "x";
    act(() => {
      first = result.current.validateAll();
    });
    expect(first).toBeNull();
    expect(result.current.noticeFor("link")).toBeNull();
  });
});

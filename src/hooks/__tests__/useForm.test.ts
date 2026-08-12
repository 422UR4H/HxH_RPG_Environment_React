import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import useForm from "../useForm";

describe("useForm", () => {
  it("starts with the given initial form state", () => {
    const { result } = renderHook(() =>
      useForm({ name: "", age: 0 })
    );
    expect(result.current.form).toEqual({ name: "", age: 0 });
  });

  it("handleForm updates only the field named by the event's target name", () => {
    const { result } = renderHook(() =>
      useForm({ name: "", email: "" })
    );

    act(() => {
      result.current.handleForm({
        target: { name: "name", value: "Gon" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.form).toEqual({ name: "Gon", email: "" });
  });

  it("setForm replaces the whole state object", () => {
    const { result } = renderHook(() =>
      useForm({ name: "", email: "" })
    );

    act(() => {
      result.current.setForm({ name: "Killua", email: "killua@zoldyck.com" });
    });

    expect(result.current.form).toEqual({
      name: "Killua",
      email: "killua@zoldyck.com",
    });
  });
});

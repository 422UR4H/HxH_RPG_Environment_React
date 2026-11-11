import { useState, type ChangeEvent, type CompositionEvent } from "react";
import { limitedValue, markCompositionStart, useFrameBag } from "../utils/limitedInput";

type FormEl = HTMLInputElement | HTMLTextAreaElement;

export default function useForm<
  // Must be a `type`, not an `interface`: a plain interface has no index
  // signature and does not satisfy `Record<string, ...>`, which produces a
  // confusing "Index signature for type 'string' is missing" error at the
  // call site instead of pointing here.
  T extends Record<string, string | number | boolean | null>,
>(initialForm: T, maxChars?: Partial<Record<keyof T, number>>) {
  const [form, setForm] = useState<T>(initialForm);
  const frames = useFrameBag();

  function handleForm(e: ChangeEvent<FormEl | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  /**
   * Props de um campo de texto do formulário. Com limite em `maxChars` (code points: emoji vale 1,
   * como no back), liga também a composição de IME; sem limite, é só o onChange simples.
   */
  function fieldProps(name: keyof T & string) {
    const value = form[name] as string;
    const max = maxChars?.[name];
    if (max === undefined) return { name, value, onChange: handleForm };
    const commit = (el: FormEl, phase: "change" | "composing" | "end") =>
      setForm({ ...form, [name]: limitedValue(el, String(form[name] ?? ""), max, phase, frames) });
    return {
      name,
      value,
      onChange: (e: ChangeEvent<FormEl>) =>
        commit(
          e.currentTarget,
          (e.nativeEvent as InputEvent | undefined)?.isComposing ? "composing" : "change",
        ),
      onCompositionStart: (e: CompositionEvent<FormEl>) => markCompositionStart(e.currentTarget),
      onCompositionEnd: (e: CompositionEvent<FormEl>) => commit(e.currentTarget, "end"),
    };
  }
  return { form, handleForm, setForm, fieldProps };
}

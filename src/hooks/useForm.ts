import { useState, type ChangeEvent, type CompositionEvent } from "react";
import { limitedValue, markCompositionStart } from "../utils/limitedInput";

export default function useForm<
  // Must be a `type`, not an `interface`: a plain interface has no index
  // signature and does not satisfy `Record<string, ...>`, which produces a
  // confusing "Index signature for type 'string' is missing" error at the
  // call site instead of pointing here.
  T extends Record<string, string | number | boolean | null>,
>(initialForm: T, maxChars?: Partial<Record<keyof T, number>>) {
  const [form, setForm] = useState<T>(initialForm);

  // Serve a onChange e a onCompositionEnd (o limite não corta no meio de uma composição de IME).
  function handleForm(
    e:
      | ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
      | CompositionEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    if (e.type === "compositionstart") {
      markCompositionStart(e.target as HTMLInputElement);
      return;
    }
    const { name, value } = e.target as HTMLInputElement;
    // `maxLength` do HTML conta UTF-16 (emoji = 2); o limite por code points conta como o back.
    const max = maxChars?.[name as keyof T];
    if (max === undefined) {
      setForm({ ...form, [name]: value });
      return;
    }
    const phase =
      e.type === "compositionend"
        ? "end"
        : (e.nativeEvent as InputEvent | undefined)?.isComposing
          ? "composing"
          : "change";
    setForm({ ...form, [name]: limitedValue(e.target as HTMLInputElement, String(form[name] ?? ""), max, phase) });
  }
  return { form, handleForm, setForm };
}

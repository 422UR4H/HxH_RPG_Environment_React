import { useState, type ChangeEvent } from "react";
import { clampChars } from "../constants/fieldLimits";

export default function useForm<
  // Must be a `type`, not an `interface`: a plain interface has no index
  // signature and does not satisfy `Record<string, ...>`, which produces a
  // confusing "Index signature for type 'string' is missing" error at the
  // call site instead of pointing here.
  T extends Record<string, string | number | boolean | null>,
>(initialForm: T, maxChars?: Partial<Record<keyof T, number>>) {
  const [form, setForm] = useState<T>(initialForm);

  function handleForm(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    // `maxLength` do HTML conta UTF-16 (emoji = 2); o corte por code points conta como o back.
    const max = maxChars?.[name as keyof T];
    setForm({ ...form, [name]: max === undefined ? value : clampChars(value, max) });
  }
  return { form, handleForm, setForm };
}

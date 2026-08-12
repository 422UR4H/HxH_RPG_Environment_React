import { useState, type ChangeEvent } from "react";

export default function useForm<
  // Must be a `type`, not an `interface`: a plain interface has no index
  // signature and does not satisfy `Record<string, ...>`, which produces a
  // confusing "Index signature for type 'string' is missing" error at the
  // call site instead of pointing here.
  T extends Record<string, string | number | boolean | null>,
>(initialForm: T) {
  const [form, setForm] = useState<T>(initialForm);

  function handleForm(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }
  return { form, handleForm, setForm };
}

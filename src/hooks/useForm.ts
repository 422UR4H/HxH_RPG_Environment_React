import { useState, type ChangeEvent } from "react";

export default function useForm<T extends Record<string, any>>(initialForm: T) {
  const [form, setForm] = useState<T>(initialForm);

  function handleForm(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }
  return { form, handleForm, setForm };
}

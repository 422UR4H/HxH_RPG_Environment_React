import { useState, type ChangeEvent, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useForm from "../hooks/useForm";
import Form from "../components/atoms/Form";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import type { SignUpBody } from "../types/user";
import { useSignUp } from "../hooks/useSignUp";
import useToken from "../hooks/useToken";
import SignField from "../components/molecules/SignField";
import SignFormError from "../components/atoms/SignFormError";
import { getRegisterErrorMessage, PASSWORDS_MISMATCH } from "../features/auth/authErrorMessages";
import { validateRegister, type FieldErrors } from "../features/auth/validateSignForms";

const FIELD_ORDER = ["email", "nick", "password", "confirmPass"] as const;

export default function RegisterPage() {
  useDocumentTitle("Criar conta");

  const navigate = useNavigate();
  const { form, handleForm } = useForm<SignUpBody>({
    nick: "",
    email: "",
    password: "",
    confirmPass: "",
  });
  const { logout } = useToken();
  const { mutate: signUp, isPending } = useSignUp();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<(typeof FIELD_ORDER)[number]>>({});

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const name = e.target.name as (typeof FIELD_ORDER)[number];
    setFieldErrors((prev) => ({
      ...prev,
      [name]: undefined,
      // Editar a senha invalida o aviso de "não coincidem" do campo de confirmação.
      ...(name === "password" && prev.confirmPass === PASSWORDS_MISMATCH
        ? { confirmPass: undefined }
        : {}),
    }));
    handleForm(e);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    const errors = validateRegister(form);
    setFieldErrors(errors);
    const firstInvalid = FIELD_ORDER.find((name) => errors[name]);
    if (firstInvalid) {
      document.getElementById(`sign-${firstInvalid}`)?.focus();
      return;
    }
    signUp(form, {
      onSuccess: () => {
        logout();
        navigate("/", { state: { registered: form.email } });
      },
      onError: (err: unknown) => {
        setError(getRegisterErrorMessage(err));
      },
    });
  }

  return (
    <SignPagesTemplate>
      <Form onSubmit={handleSubmit}>
        <SignField
          name="email"
          label="E-mail"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="username"
          maxLength={64}
          error={fieldErrors.email}
        />
        <SignField
          name="nick"
          label="Nick"
          value={form.nick}
          onChange={handleChange}
          autoComplete="nickname"
          maxLength={20}
          error={fieldErrors.nick}
        />
        <SignField
          name="password"
          label="Senha"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          maxLength={64}
          error={fieldErrors.password}
        />
        <SignField
          name="confirmPass"
          label="Confirme a senha"
          type="password"
          value={form.confirmPass}
          onChange={handleChange}
          autoComplete="new-password"
          maxLength={64}
          error={fieldErrors.confirmPass}
        />
        {error && <SignFormError message={error} />}
        <ButtonSubmit disabled={isPending}>Criar conta</ButtonSubmit>
      </Form>
      <Link to="/">Já tem conta? Entre por aqui!</Link>
    </SignPagesTemplate>
  );
}

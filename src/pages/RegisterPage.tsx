import { useState, type FormEvent } from "react";
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
import { getRegisterErrorMessage } from "../features/auth/authErrorMessages";

function isAnyFieldEmpty({ nick, email, password, confirmPass }: SignUpBody) {
  return email === "" || password === "" || nick === "" || confirmPass === "";
}

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

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    if (isAnyFieldEmpty(form)) {
      setError("Preencha todos os campos!");
      return;
    }
    signUp(form, {
      onSuccess: () => {
        logout();
        navigate("/");
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
          onChange={handleForm}
          autoComplete="email"
          maxLength={64}
        />
        <SignField
          name="nick"
          label="Nick"
          value={form.nick}
          onChange={handleForm}
          autoComplete="username"
          maxLength={20}
        />
        <SignField
          name="password"
          label="Senha"
          type="password"
          value={form.password}
          onChange={handleForm}
          autoComplete="new-password"
          maxLength={64}
        />
        <SignField
          name="confirmPass"
          label="Confirme a senha"
          type="password"
          value={form.confirmPass}
          onChange={handleForm}
          autoComplete="new-password"
          maxLength={64}
        />
        {error && <SignFormError message={error} />}
        <ButtonSubmit disabled={isPending}>Criar conta</ButtonSubmit>
      </Form>
      <Link to="/">Já tem conta? Entre por aqui!</Link>
    </SignPagesTemplate>
  );
}

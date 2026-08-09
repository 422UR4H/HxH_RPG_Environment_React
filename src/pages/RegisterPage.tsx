import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import useForm from "../hooks/useForm";
import Form from "../components/atoms/Form";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import type { SignUpBody } from "../types/user";
import { useSignUp } from "../hooks/useSignUp";
import useToken from "../hooks/useToken";
import BaseInput from "../components/ions/BaseInput";
import InlineFeedback from "../components/ions/InlineFeedback";
import { getApiErrorDetail } from "../utils/apiError";

function isAnyFieldEmpty({ nick, email, password, confirmPass }: SignUpBody) {
  return email === "" || password === "" || nick === "" || confirmPass === "";
}

export default function RegisterPage() {
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
        setError(getApiErrorDetail(err) ?? "Erro ao criar conta");
      },
    });
  }

  return (
    <SignPagesTemplate>
      <Form onSubmit={handleSubmit}>
        <BaseInput
          name="email"
          type="email"
          placeholder="e-mail"
          value={form.email}
          onChange={handleForm}
          minLength={12}
          maxLength={64}
          required
        />
        <BaseInput
          name="nick"
          type="text"
          placeholder="nick"
          value={form.nick}
          onChange={handleForm}
          minLength={3}
          maxLength={20}
          required
        />
        <BaseInput
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleForm}
          minLength={8}
          maxLength={32}
          required
        />
        <BaseInput
          name="confirmPass"
          type="password"
          placeholder="confirm password"
          value={form.confirmPass}
          onChange={handleForm}
          minLength={8}
          maxLength={32}
          required
        />
        {error && <InlineFeedback message={error} variant="error" onDismiss={() => setError(null)} />}
        <ButtonSubmit disabled={isPending}>Sign Up</ButtonSubmit>
      </Form>
      <Link to="/">Switch back to log in</Link>
    </SignPagesTemplate>
  );
}

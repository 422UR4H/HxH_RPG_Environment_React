import { useState, useEffect, type FormEvent } from "react";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import Form from "../components/atoms/Form";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useForm from "../hooks/useForm";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import useToken from "../hooks/useToken";
import { Link, useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import { useSignIn } from "../hooks/useSignIn";
import SignField from "../components/molecules/SignField";
import SignFormError from "../components/atoms/SignFormError";
import { getLoginErrorMessage } from "../features/auth/authErrorMessages";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  useDocumentTitle("Entrar");

  const { token, login } = useToken();
  const { putUser } = useUser();
  const { form, handleForm } = useForm<LoginForm>({ email: "", password: "" });
  const navigate = useNavigate();
  const { mutate: signIn, isPending } = useSignIn();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    if (form.email === "" || form.password === "") {
      setError("Preencha todos os campos!");
      return;
    }
    signIn(form, {
      onSuccess: (data) => {
        login(data);
        putUser(data);
        navigate("/home");
      },
      onError: (err: unknown) => {
        setError(getLoginErrorMessage(err));
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
          name="password"
          label="Senha"
          type="password"
          value={form.password}
          onChange={handleForm}
          autoComplete="current-password"
          maxLength={64}
        />
        {error && <SignFormError message={error} />}
        <ButtonSubmit disabled={isPending}>Entrar</ButtonSubmit>
      </Form>
      <Link to="/sign-up">Primeira vez? Crie sua conta!</Link>
    </SignPagesTemplate>
  );
}

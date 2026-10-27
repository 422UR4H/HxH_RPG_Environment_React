import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import Form from "../components/atoms/Form";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useForm from "../hooks/useForm";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import useToken from "../hooks/useToken";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import { useSignIn } from "../hooks/useSignIn";
import SignField from "../components/molecules/SignField";
import SignFormError from "../components/atoms/SignFormError";
import SignNotice from "../components/atoms/SignNotice";
import { getLoginErrorMessage } from "../features/auth/authErrorMessages";
import { validateLogin, type FieldErrors } from "../features/auth/validateSignForms";

const REGISTERED_NOTICE = "Conta criada. Entre com seu e-mail e senha.";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  useDocumentTitle("Entrar");

  const { token, login } = useToken();
  const { putUser } = useUser();
  const location = useLocation();
  // Vem do cadastro concluído: preenche o e-mail e mostra o aviso.
  const registeredEmail = (location.state as { registered?: string } | null)?.registered;
  const { form, handleForm } = useForm<LoginForm>({
    email: registeredEmail ?? "",
    password: "",
  });
  const navigate = useNavigate();
  const { mutate: signIn, isPending } = useSignIn();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<keyof LoginForm>>({});

  function handleChange(e: ChangeEvent<HTMLInputElement>): void {
    const name = e.target.name as keyof LoginForm;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    handleForm(e);
  }

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    const errors = validateLogin(form);
    setFieldErrors(errors);
    const firstInvalid = (["email", "password"] as const).find((name) => errors[name]);
    if (firstInvalid) {
      document.getElementById(`sign-${firstInvalid}`)?.focus();
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
        {registeredEmail !== undefined && <SignNotice message={REGISTERED_NOTICE} />}
        <SignField
          name="email"
          label="E-mail"
          type="email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          maxLength={64}
          error={fieldErrors.email}
        />
        <SignField
          name="password"
          label="Senha"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          maxLength={64}
          error={fieldErrors.password}
        />
        {error && <SignFormError message={error} />}
        <ButtonSubmit disabled={isPending}>Entrar</ButtonSubmit>
      </Form>
      <Link to="/sign-up">Primeira vez? Crie sua conta!</Link>
    </SignPagesTemplate>
  );
}

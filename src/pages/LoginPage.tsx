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
import { getLoginErrorMessage, REGISTERED_NOTICE } from "../features/auth/authErrorMessages";
import { validateLogin, type FieldErrors } from "../features/auth/validateSignForms";

type LoginForm = {
  email: string;
  password: string;
};

export default function LoginPage() {
  useDocumentTitle("Entrar");

  const { token, login } = useToken();
  const { putUser } = useUser();
  const location = useLocation();
  // Vem do cadastro concluído: lido uma vez só (useState guarda o valor inicial) e depois
  // apagado do histórico, para o aviso e o e-mail não voltarem ao recarregar.
  const [registeredEmail] = useState(
    () => (location.state as { registered?: string } | null)?.registered,
  );
  const [showNotice, setShowNotice] = useState(registeredEmail !== undefined);
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

  // Consome o estado do cadastro: o aviso já foi lido para o useState, e um reload não o traz de volta.
  const carriesSignUpState = (location.state as { registered?: string } | null)?.registered !== undefined;
  useEffect(() => {
    if (carriesSignUpState) navigate(location.pathname, { replace: true, state: null });
  }, [carriesSignUpState, location.pathname, navigate]);

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    setError(null);
    setShowNotice(false);
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
        {showNotice && <SignNotice message={REGISTERED_NOTICE} />}
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

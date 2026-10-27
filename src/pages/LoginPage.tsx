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
import { getLoginErrorMessage, REGISTERED_NOTICE, SESSION_EXPIRED_NOTICE } from "../features/auth/authErrorMessages";
import { consumeSessionExpired, peekSessionExpired } from "../features/auth/sessionNotice";
import ServerWakingHint from "../components/atoms/ServerWakingHint";
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
  // Vem de um token vencido (interceptor 401 ou TokenProvider). Lido uma vez; apagado num efeito
  // (e não na leitura) para sobreviver ao StrictMode, que roda o inicializador duas vezes.
  const [sessionExpired] = useState(peekSessionExpired);
  useEffect(() => {
    consumeSessionExpired();
  }, []);
  const [showNotice, setShowNotice] = useState(true);
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
        {showNotice && registeredEmail !== undefined && <SignNotice message={REGISTERED_NOTICE} />}
        {showNotice && registeredEmail === undefined && sessionExpired && (
          <SignNotice message={SESSION_EXPIRED_NOTICE} />
        )}
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
        {isPending && <ServerWakingHint />}
      </Form>
      <Link to="/sign-up">Primeira vez? Crie sua conta!</Link>
    </SignPagesTemplate>
  );
}

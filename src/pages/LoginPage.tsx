import { useEffect, type FormEvent } from "react";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import Form from "../components/atoms/Form";
import useForm from "../hooks/useForm";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import useToken from "../hooks/useToken";
import { Link, useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import { useSignIn } from "../hooks/useSignIn";
import BaseInput from "../components/ions/BaseInput";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { token, login } = useToken();
  const { putUser } = useUser();
  const { form, handleForm } = useForm<LoginForm>({ email: "", password: "" });
  const navigate = useNavigate();
  const { mutate: signIn, isPending } = useSignIn();

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    if (form.email === "" || form.password === "") {
      alert("Preencha todos os campos!");
      return;
    }
    signIn(form, {
      onSuccess: (data) => {
        login(data);
        putUser(data);
        navigate("/home");
      },
      onError: (err: any) => {
        alert(err.response?.data?.message || "Erro ao fazer login");
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
          maxLength={64}
          required
        />
        <BaseInput
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleForm}
          minLength={3}
          maxLength={32}
          required
        />
        <ButtonSubmit disabled={isPending}>Log In</ButtonSubmit>
      </Form>
      <Link to="/sign-up">First time? Create an account!</Link>
    </SignPagesTemplate>
  );
}

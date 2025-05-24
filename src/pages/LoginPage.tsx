import { useEffect, useState, type FormEvent } from "react";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import Form from "../components/atoms/Form";
import Input from "../styles/Input";
import useForm from "../hooks/useForm";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import useToken from "../hooks/useToken";
import { Link, useNavigate } from "react-router-dom";
import useUser from "../hooks/useUser";
import type { User } from "../types/user";
import { authService } from "../services/authService";

interface LoginForm {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { token, login } = useToken();
  const { putUser } = useUser();
  const { form, handleForm } = useForm<LoginForm>({ email: "", password: "" });
  const navigate = useNavigate();

  useEffect(() => {
    if (token) navigate("/home");
  }, [token, navigate]);

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (isLoading) return;
    setIsLoading(true);

    if (form.email === "" || form.password === "") {
      alert("Preencha todos os campos!");
      setIsLoading(false);
      return;
    }

    authService
      .signIn(form)
      .then(({ data }: { data: LoginResponse }) => {
        login(data);
        putUser(data);
        navigate("/home");
      })
      .catch((err) => {
        console.log(err.response);
        alert(err.response?.data?.message || "Erro ao fazer login");
      })
      .finally(() => setIsLoading(false));
  }

  return (
    <SignPagesTemplate margin="317px">
      <Form onSubmit={handleSubmit}>
        <Input
          name="email"
          type="email"
          placeholder="e-mail"
          value={form.email}
          onChange={handleForm}
          maxLength={64}
          required
        />
        <Input
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleForm}
          minLength={3}
          maxLength={32}
          required
        />
        <ButtonSubmit disabled={isLoading}>Log In</ButtonSubmit>
      </Form>
      <Link to="/sign-up">First time? Create an account!</Link>
    </SignPagesTemplate>
  );
}

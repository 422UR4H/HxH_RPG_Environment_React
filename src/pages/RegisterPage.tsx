import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import useForm from "../hooks/useForm";
import Form from "../components/atoms/Form";
import Input from "../styles/Input";
import ButtonSubmit from "../components/atoms/ButtonSubmit";
import SignPagesTemplate from "../components/templates/SignPagesTemplate";
import type { SignUpBody } from "../types/user";
import { authService } from "../services/authService";
import useToken from "../hooks/useToken";

function isAnyFieldEmpty({ nick, email, password, confirmPass }: SignUpBody) {
  return email === "" || password === "" || nick === "" || confirmPass === "";
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { form, handleForm } = useForm<SignUpBody>({
    nick: "",
    email: "",
    password: "",
    confirmPass: "",
  });
  const { logout } = useToken();

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();

    if (isLoading) return;
    setIsLoading(true);

    if (isAnyFieldEmpty(form)) {
      alert("Preencha todos os campos!");
      setIsLoading(false);
      return;
    }

    authService
      .signUp(form)
      .then(() => {
        logout();
        navigate("/");
      })
      .catch((err) => {
        console.log(err);
        alert(err.response.data.message);
      })
      .finally(() => setIsLoading(false));
  }

  return (
    <SignPagesTemplate margin="274px">
      <Form onSubmit={handleSubmit}>
        <Input
          name="email"
          type="email"
          placeholder="e-mail"
          value={form.email}
          onChange={handleForm}
          minLength={12}
          maxLength={64}
          required
        />
        <Input
          name="nick"
          type="text"
          placeholder="nick"
          value={form.nick}
          onChange={handleForm}
          minLength={3}
          maxLength={20}
          required
        />
        <Input
          name="password"
          type="password"
          placeholder="password"
          value={form.password}
          onChange={handleForm}
          minLength={8}
          maxLength={32}
          required
        />
        <Input
          name="confirmPass"
          type="password"
          placeholder="confirm password"
          value={form.confirmPass}
          onChange={handleForm}
          minLength={8}
          maxLength={32}
          required
        />
        <ButtonSubmit disabled={isLoading}>Sign Up</ButtonSubmit>
      </Form>
      <Link to="/">Switch back to log in</Link>
    </SignPagesTemplate>
  );
}

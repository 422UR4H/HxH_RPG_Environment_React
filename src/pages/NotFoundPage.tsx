import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import { PageNotFound } from "../components/templates/PageState";

/** Rota curinga: endereço que não existe. Logado volta para a home; sem login, para o login. */
export default function NotFoundPage() {
  useDocumentTitle("Página não encontrada");

  const { token } = useToken();
  return (
    <PageNotFound
      title="Página não encontrada"
      message="O endereço pode estar errado, ou a página saiu do ar."
      back={{ label: "Ir para o início", to: token ? "/home" : "/" }}
    />
  );
}

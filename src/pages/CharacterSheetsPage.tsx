import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import space from "../assets/images/space.png";
import { useCharacterSheets } from "../hooks/useCharacterSheets";
import type { CharacterSheetSummary } from "../types/characterSheet";
import CharacterSheetCard from "../components/atoms/CharacterSheetCard";
import PageTitle from "../components/ions/PageTitle";
import ListPageTemplate from "../components/templates/ListPageTemplate";
import CreateButton from "../components/atoms/CreateButton";

function CharacterSheetsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const { data: charSheets, isPending, isFetching, isError } = useCharacterSheets(token);

  // Rules of Hooks: useEffect must be before any conditional return
  useEffect(() => {
    if (!isPending && !isFetching && charSheets && charSheets.length === 0) {
      navigate("/charactersheet/new", { replace: true });
    }
  }, [charSheets, isPending, isFetching, navigate]);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return (
    <ListPageTemplate
      bgImage={space}
      headerColor="black"
      bgAttachment="scroll"
      isPending={isPending}
      isError={isError}
      loadingLabel="Carregando..."
      errorLabel="Falha ao carregar personagens. Tente novamente mais tarde."
    >
      <PageTitle>LISTA DE PERSONAGENS</PageTitle>

      {(charSheets ?? []).map((sheet: CharacterSheetSummary) => (
        <CharacterSheetCard
          key={sheet.uuid}
          character={sheet}
          to={`/charactersheet/${sheet.uuid}`}
        />
      ))}

      <CreateButton
        variant="orange"
        label="Criar Nova Ficha"
        onClick={() => navigate("/charactersheet/new")}
      />
    </ListPageTemplate>
  );
}

export default CharacterSheetsPage;

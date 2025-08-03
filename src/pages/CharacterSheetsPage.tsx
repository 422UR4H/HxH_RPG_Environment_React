import { useEffect, useState } from "react";
import useToken from "../hooks/useToken";
import { characterSheetsService } from "../services/characterSheetsService";
import { useNavigate } from "react-router-dom";
import type { CharacterSheetSummary } from "../types/characterSheet";
import CharacterSheetCard from "../components/atoms/CharacterSheetCard";
import styled from "styled-components";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";

function CharacterSheetsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [charSheets, setCharSheets] = useState<CharacterSheetSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setIsLoading(true);

    characterSheetsService
      .listCharacterSheets(token)
      .then(({ data }: { data: CharacterSheetSummary[] }) => {
        // TODO: add create character sheet page and:
        // TODO: remove console
        console.log("Character Sheets:", data);
        // TODO: uncomment this
        // if (data.length === 0) {
        //   navigate("/charactersheets/new");
        //   return;
        // }
        setCharSheets(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching character sheets:", error);
        setError("Falha ao carregar personagens. Tente novamente mais tarde.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, navigate]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <StyledCharacterSheetsPage>
      <PageHeader to="/home" />
      <PageBody>
        <PageTitle>LISTA DE PERSONAGENS</PageTitle>

        {charSheets.map((sheet) => (
          <CharacterSheetCard
            key={sheet.uuid}
            character={sheet}
            to={`/charactersheet/${sheet.uuid}`}
          />
        ))}
      </PageBody>
    </StyledCharacterSheetsPage>
  );
}
export default CharacterSheetsPage;

const StyledCharacterSheetsPage = styled.div`
  display: flex;
  flex-direction: column;
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  /* gap: 30px; */
  gap: 8vw;
  padding: 8vw 0;
  width: 100vw;

  @media (min-width: 941px) {
    padding: 45px 0;
    gap: 45px;
  }
`;

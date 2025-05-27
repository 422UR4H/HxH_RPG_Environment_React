import { useEffect, useState } from "react";
import useToken from "../hooks/useToken";
import { characterSheetsService } from "../services/characterSheetsService";
import { useNavigate } from "react-router-dom";
import type { CharacterSheetSummary } from "../types/characterSheet";
import CharacterSheetCard from "../components/atoms/CharacterSheetCard";
import styled from "styled-components";

function CharacterSheetsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [charSheets, setCharSheets] = useState<CharacterSheetSummary[]>([]);
  // const [charSheets, setCharSheets] = useState<any[]>([]);
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
        // TODO: remove console
        console.log("Character Sheets:", data);

        if (data.length === 0) {
          navigate("/create-charactersheet");
          return;
        }
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
      <h1>Lista de Personagens</h1>
      {charSheets.map((sheet) => (
        <CharacterSheetCard
          key={sheet.uuid}
          character={sheet}
          to={`/characters/${sheet.uuid}`}
        />
      ))}
    </StyledCharacterSheetsPage>
  );
}
export default CharacterSheetsPage;

const StyledCharacterSheetsPage = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;

  /* TODO: remove */
  h1 {
    text-align: center;
  }

  @media (orientation: landscape) {
    /* justify-content: center; */
    align-items: center;
  }
`;

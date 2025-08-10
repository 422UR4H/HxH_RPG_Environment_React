import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import useToken from "../hooks/useToken";
import type { CharacterSheet } from "../types/characterSheet";
import { characterSheetsService } from "../services/characterSheetsService";
import styled from "styled-components";

function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const navigate = useNavigate();
  const [charSheet, setCharSheet] = useState<CharacterSheet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !id) {
      navigate("/");
      return;
    }
    setIsLoading(true);

    characterSheetsService
      .getCharacterSheetDetails(token, id)
      .then(({ data }: { data: CharacterSheet | null }) => {
        // TODO: remove console
        console.log("Character Sheet Details:", data);

        setCharSheet(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching character sheet details:", error);
        setError(
          "Falha ao carregar ficha do personagem. Tente novamente mais tarde."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, id, navigate]);

  if (isLoading) {
    return (
      <LoadingContainer>Carregando ficha do personagem...</LoadingContainer>
    );
  }

  if (error) {
    return <ErrorContainer>{error}</ErrorContainer>;
  }

  if (!charSheet) {
    return <ErrorContainer>Ficha não encontrada</ErrorContainer>;
  }
  return <CharacterSheetTemplate charSheet={charSheet} />;
}
export default CharacterSheetPage;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 50vh;
  font-size: 24px;
  color: white;
`;

const ErrorContainer = styled.div`
  background-color: rgba(231, 76, 60, 0.1);
  color: #e74c3c;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;

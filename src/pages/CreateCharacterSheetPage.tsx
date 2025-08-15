import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import type { CharacterSheet } from "../types/characterSheet";
import styled from "styled-components";
import { characterClassesService } from "../services/characterClassesService";
import type { CharacterClass } from "../types/characterClass";
// import type { CharacterSheet } from "../types/characterSheet";

function CreateCharacterSheetPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [charClasses, setCharClasses] = useState<CharacterClass[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const sheetMode: SheetMode = {
    headerMode: "create",
    profileMode: "create",
    diagramsMode: "create",
    proficiencyMode: "view",
    skillsMode: "view",
  };

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }
    setIsLoading(true);

    characterClassesService
      .listCharacterClasses(token)
      .then(({ data }: { data: CharacterClass[] }) => {
        // TODO: remove console
        console.log("Character Class Details:", data);

        setCharClasses(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching character class details:", error);
        setError(
          "Falha ao carregar classe do personagem. Tente novamente mais tarde."
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, navigate]);

  if (isLoading) {
    return (
      <LoadingContainer>Carregando classes do personagem...</LoadingContainer>
    );
  }
  if (error) {
    return <ErrorContainer>{error}</ErrorContainer>;
  }
  if (charClasses.length === 0) {
    return <ErrorContainer>Falha ao carregar classes</ErrorContainer>;
  }
  return (
    <CharacterSheetTemplate sheetMode={sheetMode} charClasses={charClasses} />
  );
}
export default CreateCharacterSheetPage;

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

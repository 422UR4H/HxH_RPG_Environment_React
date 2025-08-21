import { Navigate, useParams } from "react-router-dom";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import useToken from "../hooks/useToken";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import { useCharacterSheet } from "../hooks/useCharacterSheet";

function CharacterSheetPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useToken();
  const sheetMode: SheetMode = {
    headerMode: "view",
    profileMode: "view",
    diagramsMode: "view",
    proficiencyMode: "view",
    skillsMode: "view",
  };
  const { data: charSheet, isLoading, error } = useCharacterSheet(token, id);

  if (!token || !id) {
    return <Navigate to="/" replace />;
  }
  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{ charSheet, isLoading, error: error ? error.message : null }}
    />
  );
}
export default CharacterSheetPage;

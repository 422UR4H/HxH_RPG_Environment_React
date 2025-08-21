import { useState } from "react";
import { Navigate } from "react-router-dom";
import useToken from "../hooks/useToken";
import type { SheetMode } from "../features/sheet/types/sheetMode";
import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import { useCharacterClasses } from "../hooks/useCharacterClasses";
import type { CharacterSheet } from "../types/characterSheet";
import { createEmptyCharacterSheet } from "../features/sheet/factories/characterSheet.factory";

function CreateCharacterSheetPage() {
  const { token } = useToken();
  const [charSheet, setCharSheet] = useState<CharacterSheet>(
    createEmptyCharacterSheet()
  );
  const sheetMode: SheetMode = {
    headerMode: "create",
    profileMode: "create",
    diagramsMode: "create",
    proficiencyMode: "view",
    skillsMode: "view",
  };
  const { data: charClasses, isLoading, error } = useCharacterClasses(token);

  if (!token) {
    return <Navigate to="/" replace />;
  }
  return (
    <CharacterSheetTemplate
      sheetMode={sheetMode}
      data={{
        charSheet,
        setCharSheet,
        charClasses,
        isLoading,
        error: error ? error.message : null,
      }}
    />
  );
}
export default CreateCharacterSheetPage;

import CharacterSheetTemplate from "../features/sheet/CharacterSheetTemplate";
import type { SheetMode } from "../features/sheet/types/sheetMode";
// import type { CharacterSheet } from "../types/characterSheet";

function CreateCharacterSheetPage() {
  const sheetMode: SheetMode = {
    headerMode: "create",
    profileMode: "create",
    diagramsMode: "create",
    proficiencyMode: "view",
    skillsMode: "view",
  };

  return <CharacterSheetTemplate sheetMode={sheetMode} />;
}
export default CreateCharacterSheetPage;

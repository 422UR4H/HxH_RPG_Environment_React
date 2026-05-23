import styled from "styled-components";
import type { CharacterSheetSummary } from "../../types/characterSheet";
import { Link } from "react-router-dom";
import CharacterSheetHeader from "../molecules/CharacterSheetHeader";
import { createEmptyCharacterSheet } from "../../features/sheet/factories/characterSheet.factory";
import { colors } from "../../styles/tokens";

interface CharacterSummaryProps {
  character: CharacterSheetSummary;
  to: string;
}

export default function CharacterSheetCard({
  character: character,
  to,
}: CharacterSummaryProps) {
  const charSheet = createEmptyCharacterSheet();

  // TODO: create createEmptyCharacterSheet({ charClass: charClass })
  charSheet.characterClass = character.characterClass;
  charSheet.categoryName = character.categoryName;
  charSheet.profile = {
    nickname: character.nickName,
    fullname: character.fullName,
    age: character.age,
    briefDescription: "",
    birthday: character.birthday ?? "0000-01-01T00:00:00.000Z",
    alignment: character.alignment,
    coverUrl: character?.coverUrl,
    avatarUrl: character?.avatarUrl,
  };
  charSheet.status = {
    health: character.health,
    stamina: character.stamina,
  };
  charSheet.characterExp = {
    ...charSheet.characterExp,
    currExp: character.currExp,
    nextLvlBaseExp: character.nextLvlBaseExp,
  };

  return (
    <CardContainer to={to}>
      <CharacterSheetHeader mode={"card"} data={{ charSheet }} />
    </CardContainer>
  );
}

const CharacterName = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
  color: ${colors.textPrimary};
`;

const CardContainer = styled(Link)`
  display: block;
  background-color: ${colors.surfaceMuted};
  color: ${colors.textPrimary};
  text-decoration: none;
  overflow: hidden;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 4px 6px ${colors.shadowSoft};
  cursor: pointer;

  width: 80vw;
  max-width: 940px;
  border-radius: 26px 26px 0 0;
  border: 4px solid ${colors.textOnLight};

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px ${colors.shadowStrong};
    border-color: ${colors.redCardAccent};

    ${CharacterName} {
      color: ${colors.redCardAccent};
    }
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    width: 100%;
    border-radius: 0;

    &:hover {
      border-color: ${colors.redCardAccent};
      border-width: 4px 0 4px 0;
    }
    &:active {
      transform: scale(1);
    }
  }
`;

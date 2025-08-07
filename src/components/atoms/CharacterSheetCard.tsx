import styled from "styled-components";
import type { CharacterSheetSummary } from "../../types/characterSheet";
import { Link } from "react-router-dom";
import CharacterSheetHeader from "../molecules/CharacterSheetHeader";

interface CharacterSummaryProps {
  character: CharacterSheetSummary;
  to: string;
}

export default function CharacterSheetCard({
  // character: { health, stamina, nickName, ...charRest },
  character: { health, stamina, nickName, characterClass },
  to,
}: CharacterSummaryProps) {
  return (
    <CardContainer to={to}>
      <CharacterSheetHeader
        // cover={cover}
        // avatar={avatar}
        nick={nickName}
        characterClass={characterClass}
        health={health}
        stamina={stamina}
        lvls={[]}
        cardView={true}
      />
    </CardContainer>
  );
}

const CharacterName = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 10px;
  color: white;
`;

const CardContainer = styled(Link)`
  display: block;
  background-color: #333;
  color: white;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  max-width: 940px;
  width: 100%;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    /* border-color: rgb(255, 162, 22); */
    border-color: #ba1a3e;

    ${CharacterName} {
      /* color: #107135; */
      color: #ba1a3e;
    }
  }

  @media (min-width: 941px) {
    width: 80vw;
    border-radius: 26px 26px 0 0;

    &:hover {
      /* border: 4px solid #107135; */
      border: 4px solid #ba1a3e;
    }
  }
`;

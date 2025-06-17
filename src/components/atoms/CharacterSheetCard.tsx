import styled from "styled-components";
import type { CharacterSheetSummary } from "../../types/characterSheet";
import { Link } from "react-router-dom";
import HpBar from "../molecules/HpBar";
import SpBar from "../molecules/SpBar";

interface CharacterSummaryProps {
  character: CharacterSheetSummary;
  to: string;
}

export default function CharacterSheetCard({
  character: { health, stamina, nickName, ...charRest },
  to,
}: CharacterSummaryProps) {
  return (
    <CardContainer to={to}>
      <CardContent>
        <CharacterName>{nickName}</CharacterName>
        {/* <CoverImage src={character.coverUrl} />
        <Avatar src={character.avatarUrl} /> */}
        <CharacterInfo>
          <FullName>{charRest.fullName}</FullName>
          <CharacterClass>{charRest.characterClass}</CharacterClass>

          <HpBar current={health.current} max={health.max} />
          <SpBar current={stamina.current} max={stamina.max} />
        </CharacterInfo>
      </CardContent>
    </CardContainer>
  );
}

const CharacterName = styled.h2`
  font-family: "Oswald", sans-serif;
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
  height: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  border-width: 2px 0 2px 0;
  border-style: solid;
  border-color: #444;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border-color: rgb(255, 162, 22);

    ${CharacterName} {
      color: rgb(255, 162, 22);
    }
  }

  @media (orientation: landscape) {
    width: 80vw;
    border-radius: 16px;

    &:hover {
      border: 2px solid rgb(255, 162, 22);
    }
  }
`;

const CardContent = styled.div`
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
`;

const CharacterInfo = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`;

const FullName = styled.p`
  font-size: 16px;
  margin-bottom: 5px;
`;

const CharacterClass = styled.p`
  font-size: 14px;
  color: #9f9f9f;
  margin-bottom: 15px;
`;

import { useState } from "react";
import styled, { keyframes } from "styled-components";
import expandIcon from "../../assets/icons/vezinhopontiagudo.svg";

interface CharacterProfileProps {
  fullname: string;
  briefDescription: string;
  birthday: string;
  alignment: string;
}

export default function CharacterProfile({
  fullname,
  briefDescription,
  birthday,
  alignment,
}: CharacterProfileProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <ProfileContainer>
      <ProfileHeader onClick={toggleExpanded}>
        <ExpandIcon
          src={expandIcon}
          alt="Expandir/Retrair"
          $isExpanded={isExpanded}
        />
      </ProfileHeader>

      {isExpanded && (
        <ProfileContent>
          <ProfileName>{fullname}</ProfileName>
          <ProfileDescription>{briefDescription}</ProfileDescription>

          <ProfileDetails>
            <LeftDetails>
              <DetailItem>
                <DetailLabel>Data de Nascimento:</DetailLabel>
                <DetailValue>{birthday.split("T")[0]}</DetailValue>
                {/* Idade do personagem aqui (ao lado da data) */}
              </DetailItem>
              <DetailItem>
                <DetailLabel>Alinhamento:</DetailLabel>
                <DetailValue>{alignment}</DetailValue>
              </DetailItem>
            </LeftDetails>

            <RightDetails>
              <BackgroundButton>
                {/* Ícone do background será adicionado aqui */}
                <BackgroundText>Background</BackgroundText>
              </BackgroundButton>
            </RightDetails>
          </ProfileDetails>
        </ProfileContent>
      )}
    </ProfileContainer>
  );
}

const ProfileContainer = styled.div`
  container-type: inline-size;
  width: 100%;
  background-color: #444;
  margin-bottom: 2cqi;
  border: 3px solid black;
  overflow: visible;
  transition: all 0.3s ease;

  @media (max-width: 609px) {
    margin-bottom: 4vw;
  }
`;

const ProfileHeader = styled.div`
  width: 100%;
  height: 3.8cqi;
  /* border-bottom: 3px solid black; */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  background-color: #3a3a3a;
  transition: background-color 0.2s ease;
  overflow: visible;

  &:hover {
    background-color: #555;
  }
`;

const ExpandIcon = styled.img<{ $isExpanded: boolean }>`
  position: absolute;
  z-index: 1;
  top: 18%;
  width: 38px;
  height: 38px;
  width: 6cqi;
  height: 6cqi;
  transition: transform 0.16s ease;
  transform: ${({ $isExpanded }) =>
    $isExpanded ? "rotate(180deg)" : "rotate(0deg)"};

  -webkit-user-select: none;
  /* -moz-user-select: none; */
  /* pointer-events: none; */
  /* user-select: none; */

  &:hover {
    /* transform: scale(1.05); */
    filter: brightness(1.1);
  }
  /* &:active {
    transform: scale(0.98);
  } */
`;

const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const ProfileContent = styled.div`
  container-type: inline-size;
  padding: 20px 25px;
  animation: ${slideDown} 0.3s ease;
`;

const ProfileName = styled.h2`
  font-family: "Roboto", sans-serif;
  font-size: min(4.2cqi, 32px);
  font-weight: bold;
  color: white;
  margin-bottom: 1cqi;

  @media (max-width: 609px) {
    font-size: 5cqi;
  }
`;

const ProfileDescription = styled.p`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 24px);
  line-height: 1.6;
  color: #e0e0e0;
  margin-bottom: 2cqi;

  @media (max-width: 609px) {
    font-size: 4.6cqi;
  }
`;

const ProfileDetails = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 30px;
`;

const LeftDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const DetailLabel = styled.span`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 24px);
  color: #9f9f9f;
  font-weight: 500;

  @media (max-width: 609px) {
    font-size: 4cqi;
  }
`;

const DetailValue = styled.span`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  color: white;
  font-weight: 600;

  @media (max-width: 609px) {
    font-size: 4.6cqi;
  }
`;

const RightDetails = styled.div`
  display: flex;
  justify-content: center;
`;

const BackgroundButton = styled.button`
  background-color: #555;
  border: 2px solid #777;
  border-radius: 8px;
  padding: 0 4cqi;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease;

  &:hover {
    background-color: #666;
    border-color: #888;
  }
`;

const BackgroundText = styled.span`
  font-family: "Roboto", sans-serif;
  font-size: min(3.4cqi, 28px);
  color: white;
  font-weight: 600;

  @media (max-width: 609px) {
    font-size: 4cqi;
  }
`;

import styled, { keyframes } from "styled-components";
import BackgroundButton from "../../components/atoms/BackgroundButton";
import type { Profile } from "../../types/characterSheet";

interface ProfileDetailsProps {
  profile: Profile;
}

export default function ProfileDetails({ profile }: ProfileDetailsProps) {
  const { fullname, briefDescription, birthday, alignment } = profile;

  return (
    <ProfileContainer>
      <ProfileName>{fullname}</ProfileName>
      <ProfileDescription>{briefDescription}</ProfileDescription>

      <ProfileContent>
        <LeftDetails>
          <DetailItem>
            <DetailLabel>Data de Nascimento:</DetailLabel>
            <DetailValue>{birthday?.split("T")[0]}</DetailValue>
            {/* Idade do personagem aqui (ao lado da data) */}
          </DetailItem>
          <DetailItem>
            <DetailLabel>Alinhamento:</DetailLabel>
            <DetailValue>{alignment}</DetailValue>
          </DetailItem>
        </LeftDetails>

        <RightDetails>
          <BackgroundButton />
        </RightDetails>
      </ProfileContent>
    </ProfileContainer>
  );
}

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

const ProfileContainer = styled.div`
  container-type: inline-size;
  padding: 20px 30px;
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

const ProfileContent = styled.div`
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

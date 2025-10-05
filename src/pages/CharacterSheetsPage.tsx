import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import styled from "styled-components";
import useToken from "../hooks/useToken";
import space from "../assets/images/space.png";
import type { CharacterSheetSummary } from "../types/characterSheet";
import { characterSheetsService } from "../services/characterSheetsService";
import CharacterSheetCard from "../components/atoms/CharacterSheetCard";
import PageHeader from "../components/atoms/PageHeader";
import PageTitle from "../components/ions/PageTitle";
import PlusIcon from "../components/ions/PlusIcon";

function CharacterSheetsPage() {
  const { token } = useToken();
  const navigate = useNavigate();
  const [charSheets, setCharSheets] = useState<CharacterSheetSummary[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    setIsLoading(true);

    characterSheetsService
      .listCharacterSheets(token)
      .then(({ data }: { data: CharacterSheetSummary[] }) => {
        console.log("Character Sheets:", data);
        if (data.length === 0) {
          navigate("/charactersheet/new");
          return;
        }
        setCharSheets(data);
        setError(null);
      })
      .catch((error) => {
        console.error("Error fetching character sheets:", error);
        setError("Falha ao carregar personagens. Tente novamente mais tarde.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token, navigate]);

  if (isLoading) {
    return <div>Carregando...</div>;
  }
  if (error) {
    return <div>{error}</div>;
  }

  return (
    <StyledCharacterSheetsPage>
      <PageHeader to="/home" backgroundColor="black" />
      <PageBody>
        <PageTitle>LISTA DE PERSONAGENS</PageTitle>

        {charSheets.length === 0 ? (
          <EmptyState>
            <EmptyMessage>Você ainda não possui personagens.</EmptyMessage>
          </EmptyState>
        ) : (
          <>
            {charSheets.map((sheet) => (
              <CharacterSheetCard
                key={sheet.uuid}
                character={sheet}
                to={`/charactersheet/${sheet.uuid}`}
              />
            ))}
          </>
        )}
        <CreateButton onClick={() => navigate("/charactersheet/new")}>
          <PlusIcon />
          <span>Criar Nova Ficha</span>
        </CreateButton>
      </PageBody>
    </StyledCharacterSheetsPage>
  );
}
export default CharacterSheetsPage;

const StyledCharacterSheetsPage = styled.div`
  display: flex;
  flex-direction: column;

  min-height: 100vh;
  min-height: 100dvh;
  background-image: url(${space});
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
`;

const PageBody = styled.main`
  display: flex;
  flex-direction: column;
  align-items: center;
  /* gap: 30px; */
  gap: 8vw;
  padding: 8vw 0;
  width: 100vw;

  @media (min-width: 500px) {
    padding: 45px 0;
    gap: 45px;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
`;

const EmptyMessage = styled.p`
  color: #9f9f9f;
  font-size: 20px;
  margin-bottom: 20px;
`;

const CreateButton = styled.button`
  font-family: "Roboto", sans-serif;
  font-size: 26px;
  font-weight: 600;
  background: linear-gradient(to bottom, #ffa216 0%, #ffa216 20%, #e60000 100%);
  color: black;

  height: 100px;
  width: 80vw;
  max-width: 940px;
  border-radius: 12px;
  border: none;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;

  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    filter: brightness(1.1);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border: 4px solid black;
  }
  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 500px) {
    font-size: 22px;

    width: 100%;
    border-radius: 0px;

    &:hover {
      border-width: 4px 0px 4px 0px;
    }
    &:active {
      transform: scale(1);
    }
  }
`;

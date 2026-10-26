import { Navigate } from "react-router-dom";
import styled from "styled-components";
import useDocumentTitle from "../hooks/useDocumentTitle";
import useToken from "../hooks/useToken";
import PageHeader from "../components/atoms/PageHeader";
import LogoutButton from "../components/atoms/LogoutButton";
import NavigationCard from "../components/atoms/NavigationCard";
import space from "../assets/images/space.png";
import worldMap from "../assets/images/worldmap.png";
import { colors } from "../styles/tokens";

function HomePage() {
  const { token } = useToken();

  useDocumentTitle("Início");

  if (!token) return <Navigate to="/" replace />;

  return (
    <PageContainer>
      <PageHeader
        backgroundColor={colors.surfaceHeaderDark}
        showBack={false}
        trailing={<LogoutButton />}
      />
      <Cards>
        <NavigationCard
          to="/charactersheets"
          title="Personagens"
          description="Crie e gerencie suas fichas de personagem de jogador."
          bgImage={space}
        />
        <NavigationCard
          to="/campaigns"
          title="Campanhas"
          description="Crie e gerencie campanhas e partidas como mestre."
          bgImage={worldMap}
        />
      </Cards>
    </PageContainer>
  );
}
export default HomePage;

const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: ${colors.surfaceBar};
`;

// Os dois cards cabem inteiros na tela sem rolar: em pé, empilhados e limitados pela
// altura; deitado, lado a lado e limitados pela largura e pela altura.
const Cards = styled.main`
  --gap: clamp(20px, 4vmin, 50px);
  --header: min(102px, 15.2vw);

  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: var(--gap);
  padding: var(--gap);

  > * {
    width: min(500px, 100%, calc((100dvh - var(--header) - 3 * var(--gap)) / 2));
    min-width: 200px;
  }

  @media (orientation: landscape) {
    flex-direction: row;

    > * {
      width: min(
        500px,
        calc((100% - var(--gap)) / 2),
        calc(100dvh - var(--header) - 2 * var(--gap))
      );
    }
  }
`;

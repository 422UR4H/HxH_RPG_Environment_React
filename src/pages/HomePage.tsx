import styled from "styled-components";
import CardButtonNavigation from "../components/atoms/CardButtonNavigation";

function HomePage() {
  return (
    <StyledHomePage>
      <CardButtonNavigation to="/charactersheets">
        Personagens
      </CardButtonNavigation>
      <CardButtonNavigation to="/campaigns">Campanhas</CardButtonNavigation>
    </StyledHomePage>
  );
}
export default HomePage;

const StyledHomePage = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  gap: 50px;
  padding: 50px;
  height: 100%;

  @media (orientation: landscape) {
    flex-direction: row;
  }

  @media (max-width: 480px) and (orientation: portrait) {
    gap: 30px;
    padding: 20px;
  }
`;

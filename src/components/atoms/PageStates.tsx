import styled from "styled-components";
import { colors, alpha } from "../../styles/tokens";

export const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-height: 100dvh;
  font-size: 24px;
  color: ${colors.textPrimary};
`;

export const ErrorContainer = styled.div`
  background-color: ${alpha(colors.feedbackDanger, 0.1)};
  color: ${colors.feedbackDanger};
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin: 30px;
  font-size: 18px;
`;

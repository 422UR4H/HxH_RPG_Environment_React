// src/features/match/combat/mapCanvasStyles.ts
//
// Fila de fix (Task 13, round 1): os três styled-components do canvas do mapa eram
// byte-idênticos entre GamePlayerPage e GameMasterPage.
import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";

export const CanvasWrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const MapLoadingMessage = styled.p`
  color: ${colors.textMuted};
  font-family: ${fonts.sans};
  font-size: 16px;
  text-align: center;
  padding: 24px;
`;

export const NoMapMessage = styled.p`
  color: ${colors.textDisabled};
  font-family: ${fonts.sans};
  font-size: 16px;
  text-align: center;
  padding: 24px;
`;

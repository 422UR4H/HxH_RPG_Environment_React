// src/pages/MatchPage.styles.ts
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";

export type MatchStatus = "scheduled" | "ongoing" | "ended";

export const ActionsList = styled.div`
  position: relative;
  padding-bottom: 112px;
`;

export const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: ${colors.overlay};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const StyledLobbyDialog = styled.div`
  background-color: ${colors.surfaceSidebar};
  border-radius: 12px;
  padding: 30px;
  max-width: 480px;
  width: 90%;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const ConfirmText = styled.p`
  font-family: ${fonts.sans};
  font-size: 20px;
  color: ${colors.textPrimary};
  line-height: 1.5;
`;

export const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
`;

export const BaseDialogButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 18px;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }
  &:active {
    transform: scale(0.98);
  }
`;

export const DialogCancelButton = styled(BaseDialogButton)`
  background-color: transparent;
  border: 1px solid ${colors.textPrimary};
  color: ${colors.textPrimary};
`;

export const DialogLobbyButton = styled(BaseDialogButton)`
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
`;

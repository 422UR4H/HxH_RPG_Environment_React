// src/pages/MatchPage.styles.ts
import styled from "styled-components";
import { colors, fonts } from "../styles/tokens";

export type MatchStatus = "scheduled" | "ongoing" | "ended";

export const MatchHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;

  @media (max-width: 750px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

export const MatchTitle = styled.h1`
  font-family: ${fonts.sans};
  font-size: 42px;
  font-weight: 900;
  color: ${colors.textPrimary};
  flex: 1;
  min-width: 0;
  overflow-wrap: break-word;
`;

export const DateSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
`;

export const StatusPill = styled.span<{ $status: MatchStatus }>`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  border-radius: 20px;
  background-color: ${({ $status }) =>
    $status === "scheduled"
      ? colors.statusScheduled
      : $status === "ongoing"
      ? colors.statusOngoing
      : colors.statusEnded};
  color: ${colors.textPrimary};
`;

export const DateLabel = styled.div`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  text-align: right;
`;

export const DateValueWithTooltip = styled.span`
  text-decoration: underline dotted;
  cursor: help;
`;

export const StoryDate = styled.div`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-bottom: 20px;
`;

export const MatchBriefDescription = styled.p`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 26px;
  line-height: 1.5;
  margin-bottom: 20px;
  color: ${colors.textPrimary};
  font-style: italic;
`;

export const MatchFinalDescription = styled.p`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 18px;
  line-height: 1.5;
  font-style: italic;
  color: ${colors.textMuted};
  border-top: 1px solid ${colors.statusLeft};
  padding-top: 15px;
  margin-bottom: 20px;
`;

export const ActionsList = styled.div`
  position: relative;
  padding-bottom: 112px;
`;

export const LobbyNotOpenBanner = styled.div`
  font-family: ${fonts.sans};
  font-size: 16px;
  padding: 10px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  background-color: ${colors.overlayMedium};
  color: ${colors.textMuted};
  border: 1px solid ${colors.borderDivider};
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

export const MapsGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 112px;
`;

export const MapsEmptyText = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 20px 0;
`;

export const MapsPlaceholder = styled.p`
  font-family: ${fonts.sans};
  font-size: 16px;
  color: ${colors.textMuted};
  padding: 40px 0;
  text-align: center;
`;

export const MapCardWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const MapAttachRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

export const AttachedBadge = styled.span`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 3px 10px;
  border-radius: 20px;
  background-color: ${colors.statusOngoing};
  color: ${colors.textPrimary};
`;

export const BaseMapButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 14px;
  font-weight: 600;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:not(:disabled):hover {
    filter: brightness(1.1);
  }
  &:not(:disabled):active {
    transform: scale(0.98);
  }
`;

export const AttachButton = styled(BaseMapButton)`
  background-color: ${colors.brandAccent};
  border: none;
  color: ${colors.textPrimary};
`;

export const DetachButton = styled(BaseMapButton)`
  background-color: transparent;
  border: 1px solid ${colors.borderDivider};
  color: ${colors.textMuted};
`;

import styled from "styled-components";
import { colors, alpha } from "../../../styles/tokens";

// Os seletores são do padrão da mesa inteira (diálogos de reação e de cena também).
export {
  Segment, Segmented, Toggle, ToggleIcon, Toggles, Weapon, WeaponList, WeaponName, WeaponStats,
} from "./choiceStyles";

type Tone = "move" | "attack";

const toneColor = (tone: Tone) => (tone === "move" ? colors.mapMoveIntent : colors.mapAttackIntent);

export const Sheet = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  color: ${colors.textPrimary};
  font-size: 13px;
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
`;

export const ActorLabel = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${colors.textMuted};

  strong {
    color: ${colors.textPrimary};
  }
`;

export const ActorSelect = styled.select`
  max-width: 60%;
  font-size: 13px;
  font-weight: 600;
  padding: 3px 6px;
  border-radius: 6px;
  border: 1px solid ${colors.borderInput};
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
`;

export const IconButton = styled.button`
  border: none;
  background: transparent;
  color: ${colors.textPrimary};
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 2px 4px;
`;

export const Section = styled.div<{ $tone: Tone }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  border-left: 3px solid ${({ $tone }) => toneColor($tone)};
  background: ${colors.surfaceInputHover};
`;

export const SectionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

export const Detail = styled.span``;

export const Muted = styled.span`
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
`;

export const Hint = styled.p`
  margin: 0;
  color: ${colors.textPlaceholderStrong};
  font-size: 12px;
  font-style: italic;
`;

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

export const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 4px 3px 10px;
  border-radius: 999px;
  border: 1px solid ${colors.mapAttackIntent};
  background: ${alpha(colors.mapAttackIntent, 0.16)};
`;

export const Footer = styled.div`
  display: flex;
  gap: 8px;
`;

export const DeclareButton = styled.button`
  flex: 1;
  min-height: 40px;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &[aria-disabled="true"] {
    background: ${colors.surfaceDisabled};
    color: ${colors.textDisabledOnDark};
    cursor: not-allowed;
  }
`;

export const ClearButton = styled.button`
  min-height: 40px;
  padding: 0 14px;
  font-size: 13px;
  border: 1px solid ${colors.borderInput};
  border-radius: 8px;
  background: transparent;
  color: ${colors.textMuted};
  cursor: pointer;
`;

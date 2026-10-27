import styled from "styled-components";
import Tooltip from "../ions/Tooltip";
import useLogout from "../../hooks/useLogout";
import { colors, fonts } from "../../styles/tokens";

export default function LogoutButton() {
  const logout = useLogout();

  return (
    <Tooltip label="Fazer logout da sua conta">
      <StyledLogoutButton type="button" onClick={logout}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sair
      </StyledLogoutButton>
    </Tooltip>
  );
}

const StyledLogoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;

  font-family: ${fonts.display};
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${colors.textPrimary};

  background: transparent;
  border: 2px solid ${colors.actionDestructive};
  border-radius: 8px;

  svg {
    width: 18px;
    height: 18px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  &:hover {
    background-color: ${colors.actionDestructive};
  }
  &:active {
    background-color: ${colors.actionDestructive};
  }

  @media (max-width: 480px) {
    min-height: 44px;
    padding: 0 12px;
    font-size: 14px;
  }
`;

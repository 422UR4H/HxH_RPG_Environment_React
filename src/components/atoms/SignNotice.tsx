import styled from "styled-components";
import { colors, alpha } from "../../styles/tokens";

interface SignNoticeProps {
  message: string;
}

// Aviso neutro das telas de entrada (conta criada, sessão expirada). Mesma coluna e mesmo recuo do
// SignFormError, mas na cor de destaque do cartão claro: não é erro.
export default function SignNotice({ message }: SignNoticeProps) {
  return <StyledSignNotice role="status">{message}</StyledSignNotice>;
}

const StyledSignNotice = styled.div`
  box-sizing: border-box;
  width: 429px;
  padding: 10px 14px;
  border-left: 4px solid ${colors.actionHighlightOnLight};
  background-color: ${alpha(colors.actionHighlightOnLight, 0.08)};

  font-size: min(18px, 4.6vw);
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  color: ${colors.textOnLight};

  @media (max-width: 580px) {
    width: 100%;
  }
`;

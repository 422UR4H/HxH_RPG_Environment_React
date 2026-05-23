import { styled } from "styled-components";
import { type ReactNode } from "react";
import Logo from "../ions/Logo";
import { colors, gradients } from "../../styles/tokens";

interface SignPagesTemplateProps {
  children: ReactNode;
}

export default function SignPagesTemplate({
  children,
}: SignPagesTemplateProps) {
  return (
    <StyledSignTemplates>
      <div className="form-div">
        <Logo />
        {children}
      </div>
    </StyledSignTemplates>
  );
}

export const StyledSignTemplates = styled.div`
  background: ${gradients.signBg};
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  height: 100dvh;
  padding: 30px;

  .form-div {
    background-color: ${colors.textPrimary};
    width: min(535px, 100vw);
    border-radius: 24px;
    padding: 30px;

    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;
  }

  a {
    font-family: "Roboto", "sans-serif";
    font-size: min(20px, 6vw);
    font-weight: 600;
    line-height: 24px;
    color: ${colors.linkBlue};
  }

  @media (max-width: 480px) {
    padding: 0;

    .form-div {
      padding: 20px 0;
      border-radius: 0;
    }
  }
`;

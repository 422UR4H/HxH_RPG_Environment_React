import { styled } from "styled-components";
import { type ReactNode } from "react";
import Logo from "../ions/Logo";

interface SignPagesTemplateProps {
  children: ReactNode;
  margin?: string;
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
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  height: 100dvh;
  padding: 30px;

  .form-div {
    background-color: #666666;
    width: min(535px, 100vw);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 30px;

    border-radius: 24px;
    padding: 30px;
  }

  a {
    color: white;
    font-size: 20px;
    font-size: min(20px, 6vw);
    font-weight: 400;
    line-height: 24px;

    margin-top: 22px;
  }

  @media (max-width: 480px) {
    padding: 0;

    .form-div {
      padding: 20px 0;
      border-radius: 0;
    }
  }
`;

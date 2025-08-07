import { styled } from "styled-components";
import { type ReactNode } from "react";
import Logo from "../ions/Logo";

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
  background: linear-gradient(to bottom, #4b70a4 0%, #2e5397 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  height: 100dvh;
  padding: 30px;

  .form-div {
    background-color: white;
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
    /* color: white;
    color: #b91a40;
    color: black;
    color: #107135; */
    color: #2e5397;
  }

  @media (max-width: 480px) {
    padding: 0;

    .form-div {
      padding: 20px 0;
      border-radius: 0;
    }
  }
`;

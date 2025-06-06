import { styled } from "styled-components";
import { type ReactNode } from "react";

interface SignPagesTemplateProps {
  children: ReactNode;
  margin?: string;
}

interface StyledSignTemplatesProps {
  $margin: string;
}

export default function SignPagesTemplate({
  children,
  margin = "317px",
}: SignPagesTemplateProps) {
  return (
    <StyledSignTemplates $margin={margin}>
      <div className="form-div">{children}</div>
    </StyledSignTemplates>
  );
}

export const StyledSignTemplates = styled.div<StyledSignTemplatesProps>`
  display: flex;
  justify-content: center;

  .form-div {
    background-color: #333333;
    width: 535px;
    margin-top: ${({ $margin }) => $margin};
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  a {
    color: white;
    font-size: 20px;
    font-weight: 400;
    line-height: 24px;

    margin-top: 22px;
  }

  @media (max-width: 767px) {
    flex-direction: column;

    .form-div {
      flex-direction: column;
      width: 100vw;
      height: 175px;
      margin-top: 0px;
      padding-top: 40px;
      padding-inline: 23px;
    }
  }
`;

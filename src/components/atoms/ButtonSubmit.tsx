// import { ThreeDots } from "react-loader-spinner"; // provisionally replaced by:
import { styled, keyframes } from "styled-components";
import BaseButton from "../ions/BaseButton";

interface ButtonSubmitProps {
  disabled?: boolean;
  children?: React.ReactNode;
}

export default function ButtonSubmit({
  disabled = false,
  children,
}: ButtonSubmitProps) {
  return (
    <BaseButton type="submit" disabled={disabled}>
      {disabled ? <LoadingDots /> : children}
    </BaseButton>
    // TODO: resolve or replace react-loader-spinner extension
    // <ThreeDots
    //     height="35"
    //     color="white"
    //     ariaLabel="three-dots-loading"
    // />
    // :
    // children
    // }
    // </Button>
  );
}

const bounce = keyframes`
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1.0); }
`;

const LoadingDots = styled.div`
  display: flex;
  justify-content: center;

  &::before,
  &::after,
  & {
    content: "";
    width: 10px;
    height: 10px;
    margin: 0 5px;
    border-radius: 50%;
    background-color: white;
    display: inline-block;
    animation: ${bounce} 1.4s infinite ease-in-out both;
  }

  &::before {
    content: "";
    animation-delay: -0.32s;
  }

  &::after {
    content: "";
    animation-delay: 0.16s;
  }
`;

import styled from "styled-components";

interface BaseInputProps {
  name: string;
  type?: "text" | "email" | "password" | "number";
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  disabled?: boolean;
}

export default function BaseInput({ ...props }: BaseInputProps) {
  return <StyledInput {...props} />;
}

const StyledInput = styled.input`
  font-family: "Roboto", "sans-serif";
  font-size: min(27px, 6vw);
  font-weight: 700;
  line-height: 40px;
  color: black;

  width: 429px;
  height: 65px;
  border: none;
  border-radius: 6px;
  padding-inline: 17px;
  padding-bottom: 5px;

  &::placeholder {
    color: #9f9f9f;
  }
  &:focus {
    outline: none;
  }

  /* @media (max-width: 767px) { */
  @media (max-width: 580px) {
    width: 100%;
  }

  @media (max-width: 480px) {
    border-radius: 0;
  }

  @media (max-width: 360px) {
    height: 55px;
  }
`;

import styled from "styled-components";

const FormInput = styled.input`
  font-family: "Roboto", sans-serif;
  padding: 12px 16px;
  background-color: #493823;
  border: 2px solid #604d31;
  border-radius: 6px;
  color: white;
  font-size: 24px;

  &:focus {
    outline: none;
    border-color: #107135;
  }
`;

export default FormInput;

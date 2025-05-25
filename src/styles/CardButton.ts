import { styled } from "styled-components";

const CardButton = styled.button`
  font-family: "Oswald", "sans-serif";
  font-size: 27px;
  font-weight: 700;
  line-height: 40px;
  color: white;

  background-color: #1877f2;
  width: 500px;
  max-width: calc(100vw - 100px);
  height: 500px;
  border-radius: 12px;
  border: none;
  cursor: pointer;

  &:focus {
    outline: none;
  }
  &:hover {
    background-color: #0052cc;
  }
  &:disabled {
    background-color: #83b4ef;

    display: flex;
    justify-content: center;
    align-items: center;
  }

  @media (orientation: portrait) {
    border-radius: 16px;
  }
`;
export default CardButton;

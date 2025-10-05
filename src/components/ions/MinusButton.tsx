import styled from "styled-components";
import minusIcon from "../../assets/icons/minus.svg";

export default function MinusButton() {
  return (
    <MinusButtonContainer>
      <img src={minusIcon} alt="-" />
    </MinusButtonContainer>
  );
}

const MinusButtonContainer = styled.div`
  width: 8cqi;
  height: 7.8cqi;
  padding: 1.7cqi 0;
  cursor: pointer;
`;

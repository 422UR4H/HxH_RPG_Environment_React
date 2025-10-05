import styled from "styled-components";
import plusIcon from "../../assets/icons/plus.svg";

export default function PlusButton() {
  return (
    <PlusButtonContainer>
      <img src={plusIcon} alt="+" />
    </PlusButtonContainer>
  );
}

const PlusButtonContainer = styled.div`
  width: 8cqi;
  height: 7.98cqi;
  cursor: pointer;
`;

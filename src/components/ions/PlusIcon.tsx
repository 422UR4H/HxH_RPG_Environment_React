import styled from "styled-components";

export default function PlusIcon({ className }: { className?: string }) {
  return <StyledPlusIcon className={className}>+</StyledPlusIcon>;
}

const StyledPlusIcon = styled.span`
  font-weight: bold;
  font-size: 36px;
`;

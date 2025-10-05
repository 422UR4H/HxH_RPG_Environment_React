import styled from "styled-components";

interface BaseOptionProps {
  value: string;
  children: string;
}

export default function BaseOption({ value, children }: BaseOptionProps) {
  return <StyledBaseOption value={value}>{children}</StyledBaseOption>;
}

const StyledBaseOption = styled.option`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  padding-right: 40px;
`;

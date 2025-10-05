import type { ChangeEvent, JSXElementConstructor, ReactElement } from "react";
import styled from "styled-components";

interface BaseSelectProps {
  value?: string;
  defaultValue?: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children:
    | ReactElement<HTMLOptionElement, string | JSXElementConstructor<any>>
    | ReactElement<HTMLOptionElement, string | JSXElementConstructor<any>>[];
}

export default function BaseSelect({
  value,
  defaultValue,
  onChange,
  children,
}: BaseSelectProps) {
  return (
    <StyledBaseSelect
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
    >
      {children}
    </StyledBaseSelect>
  );
}

const StyledBaseSelect = styled.select`
  font-family: "Roboto", sans-serif;
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: white;
  background-color: #107135;
  border: 4px solid #107135;
  border-radius: 28px;
  padding: 8px min(8cqi, 46px) 8px 16px;
  cursor: pointer;

  /* remove down arrow */
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;

  /* add new down arrow */
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: min(4.4cqi, 28px);

  &:active {
    outline: none;
    border-color: #088e3b;
    border-color: white;
  }
  &:focus {
    outline: none;
  }
  &:hover {
    filter: brightness(1.1);
  }
`;

import type { ChangeEvent, ReactElement } from "react";
import styled from "styled-components";
import { colors } from "../../styles/tokens";
import type { BaseOptionProps } from "./BaseOption";

interface BaseSelectProps {
  id?: string;
  "aria-label"?: string;
  value?: string;
  defaultValue?: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactElement<BaseOptionProps> | ReactElement<BaseOptionProps>[];
}

export default function BaseSelect({
  id,
  "aria-label": ariaLabel,
  value,
  defaultValue,
  onChange,
  children,
}: BaseSelectProps) {
  return (
    <StyledBaseSelect
      id={id}
      aria-label={ariaLabel}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
    >
      {children}
    </StyledBaseSelect>
  );
}

const StyledBaseSelect = styled.select`
  font-size: min(3.8cqi, 28px);
  font-weight: 600;
  color: ${colors.textPrimary};
  background-color: ${colors.brandAccent};
  border: 4px solid ${colors.brandAccent};
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
  background-position: right min(2cqi, 12px) center;
  background-size: min(4.4cqi, 28px);

  /* Select fica fora do anel global (como os campos de texto): o foco é a borda branca. */
  &:active,
  &:focus {
    outline: none;
    border-color: ${colors.textPrimary};
  }
  &:hover {
    filter: brightness(1.1);
  }
`;

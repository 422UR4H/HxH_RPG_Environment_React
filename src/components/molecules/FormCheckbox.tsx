import styled from "styled-components";
import { colors, fonts } from "../../styles/tokens";

interface FormCheckboxProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
  helpText?: string;
  groupLabel?: string;
}

export default function FormCheckbox({
  id,
  name,
  label,
  checked,
  onChange,
  helpText,
  groupLabel,
}: FormCheckboxProps) {
  return (
    <Group>
      {groupLabel && <GroupLabel>{groupLabel}</GroupLabel>}
      <CheckboxContainer>
        <Checkbox id={id} name={name} type="checkbox" checked={checked} onChange={onChange} />
        <CheckboxLabel htmlFor={id}>{label}</CheckboxLabel>
      </CheckboxContainer>
      {helpText && <HelpText>{helpText}</HelpText>}
    </Group>
  );
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const GroupLabel = styled.span`
  font-family: ${fonts.sans};
  font-weight: 700;
  font-size: 26px;
  color: ${colors.textPrimary};
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const Checkbox = styled.input`
  width: 24px;
  height: 24px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-family: ${fonts.sans};
  font-weight: 500;
  font-size: 26px;
  cursor: pointer;
`;

const HelpText = styled.p`
  font-family: ${fonts.sans};
  font-weight: 400;
  font-size: 18px;
  color: ${colors.textPrimary};
  margin-top: 4px;
`;

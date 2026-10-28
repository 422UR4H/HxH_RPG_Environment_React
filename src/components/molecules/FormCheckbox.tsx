import styled from "styled-components";
import FieldHelpText from "../atoms/FieldHelpText";
import { colors } from "../../styles/tokens";
import { narrowForm, NARROW_LABEL_SIZE } from "../../styles/formScale";

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
      {helpText && <FieldHelpText>{helpText}</FieldHelpText>}
    </Group>
  );
}

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const GroupLabel = styled.span`
  font-weight: 700;
  font-size: 26px;
  color: ${colors.textPrimary};

  ${narrowForm} {
    font-size: ${NARROW_LABEL_SIZE}px;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px; /* área de toque; o desenho do checkbox não muda */
`;

const Checkbox = styled.input`
  width: 24px;
  height: 24px;
  cursor: pointer;
`;

const CheckboxLabel = styled.label`
  font-weight: 500;
  font-size: 26px;
  cursor: pointer;

  ${narrowForm} {
    font-size: ${NARROW_LABEL_SIZE}px;
  }
`;

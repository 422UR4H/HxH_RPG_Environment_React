// O texto final opcional de uma cena ou da partida (`brief_final_description`, 255 no banco):
// rótulo com "(opcional)", contador e a caixa de texto. Servem o Nova cena e o Encerrar partida.
import styled from "styled-components";
import { colors } from "../../../styles/tokens";
import { charLength } from "../../../constants/fieldLimits";
import { useLimitedInput } from "../../../utils/limitedInput";
import { ChoiceLabel } from "../combat/choiceStyles";

export const FINAL_DESCRIPTION_MAX = 255;

export default function FinalDescriptionField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const limit = useLimitedInput<HTMLTextAreaElement>(FINAL_DESCRIPTION_MAX, value, onChange);
  return (
    <Field>
      <LabelRow>
        <ChoiceLabel as="label" htmlFor={id}>
          {label} <Optional>(opcional)</Optional>
        </ChoiceLabel>
        <Counter aria-hidden="true">{`${charLength(value)}/${FINAL_DESCRIPTION_MAX}`}</Counter>
      </LabelRow>
      <FinalInput
        id={id}
        rows={3}
        value={value}
        {...limit}
      />
    </Field>
  );
}

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
`;

const Optional = styled.span`
  font-weight: 400;
  color: ${colors.textPlaceholderStrong};
`;

const Counter = styled.span`
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: ${colors.textPlaceholderStrong};
`;

const FinalInput = styled.textarea`
  background: ${colors.surfaceInput};
  color: ${colors.textPrimary};
  border: 1px solid ${colors.surfaceInputHover};
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  padding: 8px 10px;
  resize: vertical;
`;

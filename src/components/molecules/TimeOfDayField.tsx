import styled from "styled-components";
import { colors } from "../../styles/tokens";
import { fieldFontSize } from "../../styles/formScale";
import { joinTimeOfDay, splitTimeOfDay } from "../../utils/timeOfDay";

interface TimeOfDayFieldProps {
  /** `id` do campo de hora (o rótulo do FormField aponta para ele). */
  id: string;
  /** `"HH:MM"` ou `""`; preenchido pela metade fica `"08:"` / `":30"`. */
  value: string;
  onChange: (value: string) => void;
  "aria-describedby"?: string;
}

const onlyDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, 2);

/** Hora e minuto em dois campos numéricos, sem seletor. */
export default function TimeOfDayField({
  id,
  value,
  onChange,
  "aria-describedby": describedBy,
}: TimeOfDayFieldProps) {
  const { hour, minute } = splitTimeOfDay(value);
  const pad = (part: string) => (part.length === 1 ? `0${part}` : part);

  return (
    <Row>
      <TimeInput
        id={id}
        aria-label="Hora"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH"
        maxLength={2}
        value={hour}
        aria-describedby={describedBy}
        onChange={(e) => onChange(joinTimeOfDay(onlyDigits(e.target.value), minute))}
        onBlur={() => onChange(joinTimeOfDay(pad(hour), minute))}
      />
      <Separator aria-hidden="true">:</Separator>
      <TimeInput
        aria-label="Minuto"
        inputMode="numeric"
        autoComplete="off"
        placeholder="MM"
        maxLength={2}
        value={minute}
        aria-describedby={describedBy}
        onChange={(e) => onChange(joinTimeOfDay(hour, onlyDigits(e.target.value)))}
        onBlur={() => onChange(joinTimeOfDay(hour, pad(minute)))}
      />
    </Row>
  );
}

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TimeInput = styled.input`
  width: 4.2em;
  padding: 12px 8px;
  text-align: center;
  background-color: ${colors.surfaceInput};
  border: 2px solid ${colors.borderInput};
  border-radius: 6px;
  color: ${colors.textPrimary};
  ${fieldFontSize}

  &:focus {
    outline: none;
    border-color: ${colors.brandAccent};
  }
`;

const Separator = styled.span`
  color: ${colors.textPrimary};
  ${fieldFontSize}
`;

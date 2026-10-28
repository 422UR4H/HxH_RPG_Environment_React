import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { ptBR } from "react-day-picker/locale";
import {
  CalendarIcon,
  ClearButton,
  Placeholder,
  Popover,
  TimeRow,
  TimeSelect,
  Trigger,
  Wrapper,
} from "./DateField.styles";

interface DateFieldProps {
  id: string;
  /** `"YYYY-MM-DD"`, ou `"YYYY-MM-DDTHH:mm"` com `withTime` (mesmo formato do input nativo). */
  value: string;
  onChange: (value: string) => void;
  withTime?: boolean;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  "aria-describedby"?: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const TIME_PATTERN = /T(\d{2}):(\d{2})/;
const START_MONTH = new Date(1900, 0, 1);
const END_MONTH = new Date(2100, 11, 1);
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// Lê os dígitos da string; `new Date("YYYY-MM-DD")` seria UTC e poderia mudar o dia.
function parseDate(value: string | undefined): Date | undefined {
  const m = value ? DATE_PATTERN.exec(value) : null;
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : undefined;
}

function toISODate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${String(d.getFullYear()).padStart(4, "0")}-${mm}-${dd}`;
}

function parseTime(value: string): { hour: string; minute: string } {
  const m = TIME_PATTERN.exec(value);
  return { hour: m?.[1] ?? "00", minute: m?.[2] ?? "00" };
}

export default function DateField({
  id,
  value,
  onChange,
  withTime = false,
  required,
  disabled,
  min,
  max,
  "aria-describedby": describedBy,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draftTime, setDraftTime] = useState({ hour: "00", minute: "00" });
  const [placement, setPlacement] = useState({ above: false, shift: 0 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();

  const selected = parseDate(value);
  const time = TIME_PATTERN.test(value) ? parseTime(value) : draftTime;
  const minDate = parseDate(min);
  const maxDate = parseDate(max);

  // Abaixo do campo; acima se não couber; sem sair pela lateral da janela.
  useLayoutEffect(() => {
    if (!open || !popoverRef.current || !wrapperRef.current) return;
    const pop = popoverRef.current.getBoundingClientRect();
    const field = wrapperRef.current.getBoundingClientRect();
    // Prefere abaixo; só abre acima se couber sem cruzar o topo da janela. Se não couber em
    // nenhum lado, abre abaixo e a página rola (o calendário não encolhe).
    const fitsBelow = field.bottom + 6 + pop.height <= window.innerHeight - 8;
    const fitsAbove = field.top - 6 - pop.height >= 8;
    const above = !fitsBelow && fitsAbove;
    const overflowRight = field.left + pop.width - (window.innerWidth - 16);
    const shift = Math.min(0, -Math.max(0, overflowRight));
    const minShift = 16 - field.left;
    setPlacement({ above, shift: Math.max(shift, minShift) });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function emit(date: Date, t: { hour: string; minute: string }) {
    const day = toISODate(date);
    onChange(withTime ? `${day}T${t.hour}:${t.minute}` : day);
  }

  function handleSelectDay(date: Date | undefined) {
    if (!date) return;
    emit(date, time);
    if (!withTime) close();
  }

  function handleTime(part: "hour" | "minute", next: string) {
    const t = { ...time, [part]: next };
    setDraftTime(t);
    if (selected) emit(selected, t);
  }

  const day = selected ? toISODate(selected).split("-").reverse().join("/") : "";
  const label = day ? `${day}${withTime ? ` às ${time.hour}:${time.minute}` : ""}` : "";

  return (
    <Wrapper
      ref={wrapperRef}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <Trigger
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
      >
        {label ? <span>{label}</span> : <Placeholder>dd/mm/aaaa</Placeholder>}
        <CalendarIcon
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
        </CalendarIcon>
      </Trigger>
      {open && (
        <Popover
          ref={popoverRef}
          id={dialogId}
          role="dialog"
          aria-label="Escolher data"
          $above={placement.above}
          $shift={placement.shift}
        >
          <DayPicker
            mode="single"
            locale={ptBR}
            captionLayout="dropdown"
            startMonth={START_MONTH}
            endMonth={END_MONTH}
            defaultMonth={selected ?? minDate ?? undefined}
            selected={selected}
            onSelect={handleSelectDay}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            labels={{
              labelPrevious: () => "Mês anterior",
              labelNext: () => "Próximo mês",
            }}
            autoFocus
          />
          {withTime && (
            <TimeRow>
              <TimeSelect
                aria-label="Hora"
                value={time.hour}
                onChange={(e) => handleTime("hour", e.target.value)}
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </TimeSelect>
              <span aria-hidden="true">:</span>
              <TimeSelect
                aria-label="Minuto"
                value={time.minute}
                onChange={(e) => handleTime("minute", e.target.value)}
              >
                {MINUTES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </TimeSelect>
            </TimeRow>
          )}
          {value && (
            <ClearButton
              type="button"
              onClick={() => {
                onChange("");
                close();
              }}
            >
              Limpar
            </ClearButton>
          )}
        </Popover>
      )}
    </Wrapper>
  );
}

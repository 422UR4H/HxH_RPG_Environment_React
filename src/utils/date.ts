/**
 * Formatting helpers for ISO 8601 date/datetime strings coming from the backend.
 *
 * All three functions read the year/month/day (and hour/minute) digits directly
 * out of the string instead of parsing through `new Date(iso)`. Going through
 * `Date` converts the value to the browser's local timezone, which can shift
 * the calendar day — e.g. `"2026-08-09T23:00:00Z"` becomes 10/08 in timezones
 * ahead of UTC. The backend already sends the date the user is meant to see,
 * so we never want that conversion. Do not "simplify" this back to `Date`.
 */

type DateParts = { year: string; month: string; day: string };

const DATE_PART_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseIsoDateParts(iso: string | undefined | null): DateParts | null {
  if (!iso) return null;
  const datePart = iso.split("T")[0];
  const match = DATE_PART_PATTERN.exec(datePart);
  if (!match) return null;
  const [, year, month, day] = match;
  return { year, month, day };
}

/** `"2026-08-09T14:30:00Z"` / `"2026-08-09"` → `"09/08/2026"`. */
export function formatDateBR(iso: string | undefined | null): string {
  const parts = parseIsoDateParts(iso);
  if (!parts) return "";
  return `${parts.day}/${parts.month}/${parts.year}`;
}

/** `"2026-08-09T14:30:00Z"` → `"09/08/2026 às 14:30"`; date-only input omits the time suffix. */
export function formatDateTimeBR(iso: string | undefined | null): string {
  const parts = parseIsoDateParts(iso);
  if (!parts) return "";
  const timePart = iso!.split("T")[1];
  const time = timePart?.substring(0, 5);
  return `${parts.day}/${parts.month}/${parts.year}${time ? ` às ${time}` : ""}`;
}

/** `"2026-08-09T14:30:00Z"` / `"2026-08-09"` → `"2026-08-09"`, for `<input type="date">`. */
export function toDateInputValue(iso: string | undefined | null): string {
  const parts = parseIsoDateParts(iso);
  if (!parts) return "";
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * `"2026-08-09T14:30:00Z"` → `"2026-08-09T14:30"`, for `<input type="datetime-local">`.
 * Date-only input (no `T` section) defaults the time to `"00:00"`.
 */
export function toDateTimeLocalValue(iso: string | undefined | null): string {
  const parts = parseIsoDateParts(iso);
  if (!parts) return "";
  const timePart = iso!.split("T")[1];
  const time = timePart?.substring(0, 5) ?? "00:00";
  return `${parts.year}-${parts.month}-${parts.day}T${time}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Dia de hoje pelo relógio local, `AAAA-MM-DD`. `toISOString()` daria o dia seguinte após 21h no Brasil. */
export function todayLocalISODate(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Data/hora local no formato de `<input type="datetime-local">`, `AAAA-MM-DDTHH:mm`. */
export function toLocalDateTimeInputValue(date: Date): string {
  return `${todayLocalISODate(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Dias de hoje até a data (negativo = passada), contados pelas partes da data, sem fuso. */
export function daysFromToday(isoDate: string, now: Date = new Date()): number {
  const parts = parseIsoDateParts(isoDate);
  if (!parts) return NaN;
  const target = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

/*
 * Dois tipos de data convivem neste arquivo:
 * - Data da história (no universo do jogo, só o dia): lida pelos dígitos, acima. Não tem fuso.
 * - Instante real (gameScheduledAt, gameStartAt, gameEndAt, nextGameScheduledAt): um momento
 *   no tempo, guardado em UTC pelo backend. Passa por `Date` para ser mostrado/editado no
 *   fuso de quem está olhando, e é enviado ao backend como ISO UTC.
 */

/** `"2026-11-10T15:00"` (input local) → instante UTC (`""` se vazio/inválido), ex. `"2026-11-10T18:00:00.000Z"` no Brasil. */
export function localInputToInstant(localValue: string): string {
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** Instante ISO → `AAAA-MM-DDTHH:mm` no fuso local, para `<input type="datetime-local">`. */
export function instantToLocalInput(iso: string | undefined | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return toLocalDateTimeInputValue(date);
}

/** Instante ISO → `"10/11/2026 às 15:00"` no fuso local. */
export function formatInstantDateTimeBR(iso: string | undefined | null): string {
  const local = instantToLocalInput(iso);
  if (!local) return "";
  const [date, time] = local.split("T");
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year} às ${time}`;
}

/** Instante ISO → `"10/11/2026"`, o dia no fuso local. */
export function formatInstantDateBR(iso: string | undefined | null): string {
  return formatInstantDateTimeBR(iso).split(" ")[0];
}

/** Dias de hoje até o dia local do instante (negativo = passado). */
export function daysFromTodayInstant(iso: string, now: Date = new Date()): number {
  const local = instantToLocalInput(iso);
  if (!local) return NaN;
  return daysFromToday(local.split("T")[0], now);
}

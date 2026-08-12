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

// Tempo da história é ingênuo: "2000-01-01T08:30:00", sem fuso. Nada aqui usa o objeto de
// data do navegador (ele aplicaria o fuso local); toda conta é aritmética de dias do
// calendário gregoriano proléptico.

export type StoryParts = { y: number; mo: number; d: number; h: number; mi: number; s: number };

const STORY_RE = /^(\d{4,})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/;

/** Lê "AAAA-MM-DDTHH:MM:SS". Recusa "Z" e deslocamentos: o relógio da história não tem fuso. */
export function parseStory(s: string): StoryParts {
  const m = STORY_RE.exec(s);
  if (!m) throw new Error(`invalid story time: ${s}`);
  const [y, mo, d, h, mi, sec] = m.slice(1).map(Number);
  return { y, mo, d, h, mi, s: sec };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

export function formatStory(p: StoryParts): string {
  return `${pad(p.y, 4)}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
}

// Dias desde 1970-01-01 (algoritmo days-from-civil, de H. Hinnant).
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = m <= 2 ? y - 1 : y;
  const era = Math.floor(yy / 400);
  const yoe = yy - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function civilFromDays(z0: number): { y: number; mo: number; d: number } {
  const z = z0 + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor((doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365);
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const d = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const mo = mp < 10 ? mp + 3 : mp - 9;
  return { y: yoe + era * 400 + (mo <= 2 ? 1 : 0), mo, d };
}

/** Segundos desde 1970-01-01T00:00:00 do mesmo calendário ingênuo. */
function toSeconds(s: string): number {
  const p = parseStory(s);
  return daysFromCivil(p.y, p.mo, p.d) * 86400 + p.h * 3600 + p.mi * 60 + p.s;
}

function fromSeconds(total: number): string {
  const days = Math.floor(total / 86400);
  const rest = total - days * 86400;
  const { y, mo, d } = civilFromDays(days);
  return formatStory({ y, mo, d, h: Math.floor(rest / 3600), mi: Math.floor((rest % 3600) / 60), s: rest % 60 });
}

export function addSeconds(s: string, n: number): string {
  return fromSeconds(toSeconds(s) + n);
}

/** a − b, em segundos. */
export function diffSeconds(a: string, b: string): number {
  return toSeconds(a) - toSeconds(b);
}

export function compareStory(a: string, b: string): -1 | 0 | 1 {
  const d = toSeconds(a) - toSeconds(b);
  return d < 0 ? -1 : d > 0 ? 1 : 0;
}

export function formatDateBR(s: string): string {
  const p = parseStory(s);
  return `${pad(p.d)}/${pad(p.mo)}/${pad(p.y, 4)}`;
}

export function formatTime(s: string): string {
  const p = parseStory(s);
  return `${pad(p.h)}:${pad(p.mi)}:${pad(p.s)}`;
}

/** "+2 h 10 min", "−15 min", "+1 dia 2 h", "0 s" (o sinal de menos é U+2212). */
export function formatDelta(seconds: number): string {
  if (seconds === 0) return "0 s";
  const abs = Math.abs(seconds);
  const days = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const mi = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? "dia" : "dias"}`);
  if (h) parts.push(`${h} h`);
  if (mi) parts.push(`${mi} min`);
  if (s) parts.push(`${s} s`);
  return `${seconds < 0 ? "−" : "+"}${parts.join(" ")}`;
}

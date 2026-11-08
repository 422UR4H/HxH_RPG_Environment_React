/** Hora do dia do formulário: `"HH:MM"` ou `""`. Preenchida pela metade fica como `"08:"` / `":30"`. */

export function splitTimeOfDay(value: string): { hour: string; minute: string } {
  const [hour = "", minute = ""] = value.split(":");
  return { hour, minute };
}

export function joinTimeOfDay(hour: string, minute: string): string {
  return hour || minute ? `${hour}:${minute}` : "";
}

/** Do `"HH:MM:SS"` da API para o `"HH:MM"` exibido. */
export function toTimeOfDayValue(apiTime: string | undefined): string {
  return apiTime ? apiTime.slice(0, 5) : "";
}

/** Mensagem de erro do campo (ou null): meio preenchido ou fora de 00-23 / 00-59. */
export function timeOfDayMessage(value: string): string | null {
  if (!value) return null;
  const { hour, minute } = splitTimeOfDay(value);
  if (!hour.trim() || !minute.trim()) return "Preencha hora e minuto.";
  if (Number(hour) > 23 || Number(minute) > 59) {
    return "Informe uma hora de 00 a 23 e minutos de 00 a 59.";
  }
  return null;
}

/** Completa com zero à esquerda ("8:5" vira "08:05") para o formato que a API aceita. */
export function normalizeTimeOfDay(value: string): string {
  if (!value) return "";
  const { hour, minute } = splitTimeOfDay(value);
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

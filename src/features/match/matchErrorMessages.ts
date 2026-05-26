const matchValidationMessages: Record<string, string> = {
  "validation error: title must be at least 5 characters":
    "O título deve ter pelo menos 5 caracteres.",
  "validation error: title cannot exceed 32 characters":
    "O título não pode ter mais de 32 caracteres.",
  "validation error: brief description cannot exceed 255 characters":
    "A descrição breve não pode ter mais de 255 caracteres.",
  "validation error: game scheduled at cannot be in the past":
    "A data e hora da sessão não pode estar no passado.",
  "validation error: game scheduled at cannot be greater than one year from now":
    "A data da sessão deve ser nos próximos 12 meses.",
  "validation error: story start date must be after campaign start date":
    "A data de início na história deve ser igual ou posterior ao início da campanha.",
  "validation error: story start date must be before campaign end date":
    "A data de início na história deve ser anterior ao fim da campanha.",
};

export function getMatchValidationMessage(detail: string): string | undefined {
  return matchValidationMessages[detail];
}

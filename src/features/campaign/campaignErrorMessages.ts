const campaignValidationMessages: Record<string, string> = {
  "validation error: name must be at least 5 characters":
    "O nome deve ter pelo menos 5 caracteres.",
  "validation error: name cannot exceed 32 characters":
    "O nome não pode ter mais de 32 caracteres.",
  "validation error: brief description cannot exceed 255 characters":
    "A descrição breve não pode ter mais de 255 caracteres.",
  "validation error: call link cannot exceed 255 characters":
    "O link de chamada não pode ter mais de 255 caracteres.",
  "validation error: campaign has already ended":
    "A campanha já foi encerrada e não pode ser editada.",
  "validation error: name and story_start_at cannot be changed after a match has started":
    "Nome e data de início não podem ser alterados após uma partida ter sido iniciada.",
  "validation error: story_current_at cannot be set to a date earlier than the current value":
    "A data corrente da história não pode ser anterior ao valor atual.",
};

export function getCampaignValidationMessage(detail: string): string | undefined {
  return campaignValidationMessages[detail];
}

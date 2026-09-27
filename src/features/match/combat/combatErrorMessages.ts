/** Uma recusa do servidor. Mora aqui, e não no banner, porque o reducer (T4) também a guarda. */
export type WsError = { code: string; message: string; sentType?: string; at: number };

// Mapeia o CÓDIGO do erro (contrato §7), nunca a prosa. `game_error` é o texto do erro de
// domínio e vai como veio — traduzi-lo aqui seria manter um dicionário do domínio no front.
const byCode: Record<string, string> = {
  invalid_message: "Mensagem malformada — recarregue a página.",
  unknown_type: "O servidor não reconheceu esta operação.",
  invalid_payload: "O servidor recusou o formato do envio.",
  forbidden: "Só o mestre pode fazer isso.",
  match_not_started: "A partida ainda não começou.",
  invalid_action: "Ação inválida.",
  move_blocked: "O movimento esbarra numa parede.",
};

const bySentType: Record<string, string> = {
  enqueue_action: "Não foi possível declarar a ação",
  open_next_action: "Não foi possível abrir o próximo turno",
  pull_action: "Não foi possível antecipar esta ação",
  close_turn: "Não foi possível fechar o turno",
  change_round_mode: "Não foi possível trocar o regime",
  enqueue_master_action: "Não foi possível executar a ação do mestre",
};

export function combatErrorText(code: string, message: string, sentType?: string): string {
  const base = code === "game_error" ? message : (byCode[code] ?? message ?? "Erro do servidor.");
  const prefix = sentType ? bySentType[sentType] : undefined;
  const detail = code === "game_error" || !message ? base : `${base} (${message})`;
  return prefix ? `${prefix}: ${detail}` : detail;
}

/** Uma recusa do servidor. Mora aqui, e não no banner, porque o reducer (T4) também a guarda. */
export type WsError = { code: string; message: string; sentType?: string; at: number };

// Mapeia o CÓDIGO do erro (contrato §7), nunca a prosa. `game_error` é o texto do erro de
// domínio e vai como veio — exceto as poucas mensagens que o contrato documenta e o usuário
// vê sempre (`byGameMessage`); o resto traduzir seria manter um dicionário do domínio no front.
const byCode: Record<string, string> = {
  invalid_message: "Mensagem malformada — recarregue a página.",
  unknown_type: "O servidor não reconheceu esta operação.",
  invalid_payload: "O servidor recusou o formato do envio.",
  forbidden: "Só o mestre pode fazer isso.",
  match_not_started: "A partida ainda não começou.",
  invalid_action: "Ação inválida.",
  move_blocked: "O movimento esbarra numa parede.",
  out_of_reach: "É preciso estar encostado na parede para abrir, fechar ou arrombar.",
  not_found: "Não encontrado.",
  invalid_npc: "Esse personagem não pode entrar como NPC desta partida.",
  not_participant: "Esse personagem não está na partida.",
  clock_not_set: "Defina a hora da partida antes.",
  clock_already_set: "A hora inicial já foi definida.",
  clock_below_limit: "Não dá para voltar antes do limite do relógio.",
  clock_long_skip_unconfirmed: "Confirme o avanço de mais de 2 dias.",
  clock_play_in_race: "No turno disputado, cada round vale 1 segundo: o tempo real fica desligado.",
  clock_already_running: "O tempo real já está ligado.",
  match_in_battle: "Encerre o combate antes de encerrar a partida.",
  not_battle_scene: "A cena atual não é de combate.",
  match_already_ended: "A partida já foi encerrada.",
};

const bySentType: Record<string, string> = {
  enqueue_action: "Não foi possível declarar a ação",
  open_next_action: "Não foi possível abrir o próximo turno",
  pull_action: "Não foi possível antecipar esta ação",
  close_turn: "Não foi possível fechar o turno",
  change_round_mode: "Não foi possível trocar o regime",
  enqueue_master_action: "Não foi possível executar a ação do mestre",
  change_scene: "Não foi possível trocar de cena",
  add_npc: "Não foi possível pôr o NPC na partida",
  edit_action: "Não foi possível editar a ação",
  attach_reaction: "Não foi possível reagir",
  open_reaction: "Não foi possível dar a palavra",
  cancel_action: "Não foi possível cancelar a ação",
  set_clock_start: "Não foi possível definir a hora da partida",
  adjust_clock: "Não foi possível ajustar o relógio",
  set_clock: "Não foi possível mudar o relógio",
  play_clock: "Não foi possível ligar o tempo real",
  pause_clock: "Não foi possível pausar o relógio",
  get_combat_summary: "Não foi possível ler o resumo do combate",
  end_match: "Não foi possível encerrar a partida",
};

// Mensagens de domínio documentadas no contrato; a tradução vai sozinha, sem o prefixo do envio.
const byGameMessage: Record<string, string> = {
  "action queue is empty": "A fila de ações está vazia.",
  "action not found in queue": "A ação já não está na fila.",
  "action is stacked on a pending move": "Este movimento está empilhado em outro que ainda não abriu — abra aquele primeiro.",
  "action actor does not match player": "Essa ação não é sua.",
  "validation error: no turn opened in this round yet": "Nenhum turno aconteceu nesta rodada ainda — não há o que encerrar.",
};

export function combatErrorText(code: string, message: string, sentType?: string): string {
  if (code === "game_error" && byGameMessage[message]) return byGameMessage[message];
  const base = code === "game_error" ? message : (byCode[code] ?? message ?? "Erro do servidor.");
  const prefix = sentType ? bySentType[sentType] : undefined;
  const detail = code === "game_error" || !message ? base : `${base} (${message})`;
  return prefix ? `${prefix}: ${detail}` : detail;
}

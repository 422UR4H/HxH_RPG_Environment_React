import type { CombatCatalogue } from "../../../services/characterSheetsService";
import type { GridKind } from "../../../types/tacticalMap";
import {
  removeTarget, setMoveCategory, setWeapon, toggleAttack, toggleMove,
} from "./actionDraft";
import type { ActionDraft, DraftKind, DraftVerdict, ResolvedDraft } from "./actionDraft";
import type { MoveCategory } from "./combatMessages";
import { formatSlot, humanWeapon } from "./combatText";
import * as S from "./ActionComposer.styles";

const MOVE_CATEGORIES: Array<{ value: MoveCategory; label: string; hint: string }> = [
  { value: "Dash", label: "Dash", hint: "corrida — rola a velocidade" },
  { value: "Shift", label: "Shift", hint: "passo firme — não rola" },
];

const DECLARE_LABELS: Record<DraftKind, string> = {
  move: "Declarar movimento",
  attack: "Declarar ataque",
  combined: "Declarar movimento + ataque",
};

const NOT_READY_HINTS: Record<Exclude<DraftVerdict, { ready: true }>["reason"], string> = {
  empty: "Toque num espaço vazio do mapa para se mover, ou em alguém para atacar.",
  needs_destination: "Toque num espaço do mapa para escolher o destino — ou desligue Mover.",
  needs_target: "Toque em alguém no mapa para marcar o alvo — ou desligue Atacar.",
};

/**
 * O painel de compor uma ação. Mover e Atacar são interruptores independentes — nenhum vem
 * ligado: a ação declarada é o que estiver ligado (só movimento, só ataque, ou os dois numa
 * ação combinada). O mapa liga cada um sozinho: tocar num espaço vazio escolhe o destino,
 * tocar em alguém escolhe o alvo. Sem campo de perícia — o servidor deriva o acerto.
 *
 * Nenhum `isMaster` aqui: a página decide quem pode compor e para qual ator.
 */
export default function ActionComposer({
  actorName,
  actors,
  actorId,
  onActorChange,
  onClearActor,
  draft,
  resolved,
  verdict,
  catalogue,
  gridKind,
  defaultCategory,
  nameOf,
  onDraftChange,
  onDeclare,
  canDeclare,
  blockedReason,
}: {
  actorName: string;
  /** Mais de um personagem para agir (o jogador com duas fichas na partida): vira seletor. */
  actors?: Array<{ id: string; name: string }>;
  actorId?: string;
  onActorChange?: (id: string) => void;
  onClearActor?: () => void;
  draft: ActionDraft;
  resolved: ResolvedDraft;
  verdict: DraftVerdict;
  catalogue?: CombatCatalogue;
  gridKind: GridKind;
  defaultCategory: MoveCategory;
  nameOf: (characterId: string) => string;
  onDraftChange: (next: ActionDraft) => void;
  onDeclare: () => void;
  /** Conexão viva e nenhum envio deste ator esperando resposta. */
  canDeclare: boolean;
  /** Por que não dá para declarar agora, quando o motivo não é o rascunho. */
  blockedReason?: string;
}) {
  const move = resolved.move;
  const attack = resolved.attack;
  const moveOn = move !== undefined;
  const attackOn = attack !== undefined;
  const category = move?.category ?? draft.category ?? defaultCategory;
  const selectedWeapon = attack?.weapon ?? "Fist";
  const primaryTarget = attack?.targets[0];
  const farTarget =
    attackOn && primaryTarget && resolved.targetSteps !== undefined && resolved.targetSteps > 1;

  return (
    <S.Sheet aria-label="Compor ação">
      <S.Header>
        {actors && actors.length > 1 && onActorChange ? (
          <S.ActorLabel as="label">
            Agindo como{" "}
            <S.ActorSelect aria-label="Personagem" value={actorId} onChange={(e) => onActorChange(e.target.value)}>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </S.ActorSelect>
          </S.ActorLabel>
        ) : (
          <S.ActorLabel>
            Agindo como <strong>{actorName}</strong>
          </S.ActorLabel>
        )}
        {onClearActor && (
          <S.IconButton type="button" aria-label="Soltar ator" title="Soltar ator" onClick={onClearActor}>
            ×
          </S.IconButton>
        )}
      </S.Header>

      <S.Toggles role="group" aria-label="O que fazer">
        <S.Toggle
          type="button"
          $tone="move"
          aria-pressed={moveOn}
          onClick={() => onDraftChange(toggleMove(draft, resolved))}
        >
          <S.ToggleIcon aria-hidden>➜</S.ToggleIcon>
          Mover
        </S.Toggle>
        <S.Toggle
          type="button"
          $tone="attack"
          aria-pressed={attackOn}
          onClick={() => onDraftChange(toggleAttack(draft))}
        >
          <S.ToggleIcon aria-hidden>⚔</S.ToggleIcon>
          Atacar
        </S.Toggle>
      </S.Toggles>

      {moveOn && (
        <S.Section $tone="move" aria-label="Movimento">
          <S.SectionRow>
            {move.to ? (
              <S.Detail data-testid="move-destination">
                Destino: {formatSlot(move.to, gridKind)}
                {move.auto && primaryTarget && (
                  <S.Muted> — ao lado de {nameOf(primaryTarget)}</S.Muted>
                )}
              </S.Detail>
            ) : (
              <S.Hint>Toque num espaço do mapa para escolher o destino.</S.Hint>
            )}
          </S.SectionRow>
          <S.Segmented role="radiogroup" aria-label="Tipo de movimento">
            {MOVE_CATEGORIES.map((c) => (
              <S.Segment
                key={c.value}
                type="button"
                role="radio"
                aria-checked={category === c.value}
                title={c.hint}
                onClick={() => onDraftChange(setMoveCategory(draft, c.value))}
              >
                {c.label}
              </S.Segment>
            ))}
          </S.Segmented>
          {move.auto && (
            <S.Muted>Ataque à distância? Desligue Mover e ataque de onde está.</S.Muted>
          )}
        </S.Section>
      )}

      {attackOn && (
        <S.Section $tone="attack" aria-label="Ataque">
          {attack.targets.length > 0 ? (
            <S.Chips aria-label="Alvos">
              {attack.targets.map((id) => {
                const label = nameOf(id);
                return (
                  <S.Chip key={id}>
                    {label}
                    <S.IconButton
                      type="button"
                      aria-label={`Remover ${label}`}
                      onClick={() => onDraftChange(removeTarget(draft, id))}
                    >
                      ×
                    </S.IconButton>
                  </S.Chip>
                );
              })}
            </S.Chips>
          ) : (
            <S.Hint>Toque em alguém no mapa para marcar o alvo · segure para marcar vários.</S.Hint>
          )}
          {farTarget && !moveOn && (
            <S.Muted>
              {resolved.approachBlocked
                ? `Não há espaço livre ao lado de ${nameOf(primaryTarget)} — escolha um destino no mapa, ou ataque à distância.`
                : `${nameOf(primaryTarget)} está a ${resolved.targetSteps} espaços — ataque à distância.`}
            </S.Muted>
          )}
          {catalogue && (
            <S.WeaponList role="radiogroup" aria-label="Arma">
              {catalogue.weapons.map((w) => (
                <S.Weapon
                  key={w.name}
                  type="button"
                  role="radio"
                  aria-checked={selectedWeapon === w.name}
                  onClick={() => onDraftChange(setWeapon(draft, w.name))}
                >
                  <S.WeaponName>{humanWeapon(w.name)}</S.WeaponName>
                  <S.WeaponStats>
                    {w.dice.map((d) => `d${d}`).join("+")}
                    {w.flatDamage ? ` +${w.flatDamage}` : ""} · prof. {w.proficiencyLevel}
                  </S.WeaponStats>
                </S.Weapon>
              ))}
            </S.WeaponList>
          )}
        </S.Section>
      )}

      <S.Footer>
        <S.DeclareButton
          type="button"
          disabled={!verdict.ready || !canDeclare}
          onClick={onDeclare}
        >
          {verdict.ready ? DECLARE_LABELS[verdict.kind] : "Declarar"}
        </S.DeclareButton>
        {(moveOn || attackOn) && (
          <S.ClearButton type="button" onClick={() => onDraftChange({ moveMode: "none" })}>
            Limpar
          </S.ClearButton>
        )}
      </S.Footer>
      {!verdict.ready ? (
        <S.Hint data-testid="composer-hint">{NOT_READY_HINTS[verdict.reason]}</S.Hint>
      ) : (
        blockedReason && <S.Hint data-testid="composer-hint">{blockedReason}</S.Hint>
      )}
    </S.Sheet>
  );
}

import BlockableButton from "../../../components/molecules/BlockableButton";
import usePointerVerb from "../../../hooks/usePointerVerb";
import type { CombatCatalogue } from "../../../services/characterSheetsService";
import type { GridKind } from "../../../types/tacticalMap";
import {
  removeTarget, setActKind, setMoveCategory, setWeapon, toggleAct, toggleMove,
} from "./actionDraft";
import type { ActionDraft, DraftVerdict, ResolvedDraft } from "./actionDraft";
import type { MoveCategory } from "./combatMessages";
import { formatSlot, weaponLabel } from "./combatText";
import { ACT_ICONS, ACT_LABELS, ACT_NOUNS } from "./wallVerbs";
import type { ActKind } from "./wallVerbs";
import * as S from "./ActionComposer.styles";

const MOVE_CATEGORIES: Array<{ value: MoveCategory; label: string; hint: string }> = [
  { value: "Dash", label: "Dash", hint: "corrida — rola a velocidade" },
  { value: "Shift", label: "Shift", hint: "passo firme — não rola" },
];

/** "Declarar movimento", "Declarar ataque", "Declarar movimento + abertura". */
function declareLabel(verdict: DraftVerdict, kind: ActKind): string {
  if (!verdict.ready) return "Declarar";
  if (verdict.kind === "move") return "Declarar movimento";
  if (verdict.kind === "act") return `Declarar ${ACT_NOUNS[kind]}`;
  return `Declarar movimento + ${ACT_NOUNS[kind]}`;
}

const NOT_READY_HINTS: Record<Exclude<DraftVerdict, { ready: true }>["reason"], (verb: string) => string> = {
  empty: (verb) => `${verb} num espaço vazio do mapa para se mover, ou em alguém (ou numa parede) para agir.`,
  needs_destination: (verb) => `${verb} num espaço do mapa para escolher o destino — ou desligue Mover.`,
  needs_target: (verb) => `${verb} em alguém ou numa parede para marcar o alvo — ou desligue Atacar.`,
  out_of_reach: () => "Para abrir, fechar ou arrombar é preciso estar encostado na parede — ligue Mover ou escolha um destino ao lado dela.",
};

/**
 * O painel de compor uma ação. Mover e Atacar são interruptores independentes — nenhum vem
 * ligado: a ação declarada é o que estiver ligado (só movimento, só ataque, ou os dois numa
 * ação combinada). O mapa liga cada um sozinho: tocar num espaço vazio escolhe o destino,
 * tocar em alguém (ou numa parede) escolhe o alvo. Com parede como alvo, "Atacar" vira o
 * verbo escolhido no seletor "O que fazer" (Abrir, Fechar, Arrombar…), e as armas só aparecem
 * no ataque. Sem campo de perícia — o servidor deriva o acerto.
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
  unavailableReason,
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
  /** A sala ainda não está pronta (sem conexão ou sem tabuleiro): Mover, Atacar e Declarar ficam indisponíveis, com este motivo. */
  unavailableReason?: string;
}) {
  const verb = usePointerVerb();
  const move = resolved.move;
  const act = resolved.act;
  const moveOn = move !== undefined;
  const actOn = act !== undefined;
  const actKind: ActKind = act?.kind ?? "attack";
  const category = move?.category ?? draft.category ?? defaultCategory;
  const selectedWeapon = act?.weapon ?? "Fist";
  const primaryTarget = act?.targets[0];
  const farTarget =
    actOn && primaryTarget && resolved.targetSteps !== undefined && resolved.targetSteps > 1;

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
          as={BlockableButton}
          blockedReason={unavailableReason}
          $tone="move"
          aria-pressed={moveOn}
          onClick={() => onDraftChange(toggleMove(draft, resolved))}
        >
          <S.ToggleIcon aria-hidden>➜</S.ToggleIcon>
          Mover
        </S.Toggle>
        {/* A metade que mira: com parede como alvo, mostra o verbo escolhido (Abrir, Fechar…). */}
        <S.Toggle
          type="button"
          as={BlockableButton}
          blockedReason={unavailableReason}
          $tone="attack"
          aria-pressed={actOn}
          onClick={() => onDraftChange(toggleAct(draft))}
        >
          <S.ToggleIcon aria-hidden>{ACT_ICONS[actKind]}</S.ToggleIcon>
          {ACT_LABELS[actKind]}
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
              <S.Hint>{verb} num espaço do mapa para escolher o destino.</S.Hint>
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
          {/* Só o ataque tem "à distância": abrir ou arrombar pede estar encostado. */}
          {move.auto && actKind === "attack" && (
            <S.Muted>Ataque à distância? Desligue Mover e ataque de onde está.</S.Muted>
          )}
        </S.Section>
      )}

      {actOn && (
        <S.Section $tone="attack" aria-label={actKind === "attack" ? "Ataque" : ACT_LABELS[actKind]}>
          {act.targets.length > 0 ? (
            <S.Chips aria-label="Alvos">
              {act.targets.map((id) => {
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
            <S.Hint>{verb} em alguém ou numa parede para marcar o alvo · segure para marcar vários.</S.Hint>
          )}
          {act.verbs && (
            <S.Segmented role="radiogroup" aria-label="O que fazer">
              {act.verbs.map((v) => (
                <S.Segment
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={actKind === v}
                  onClick={() => onDraftChange(setActKind(draft, v))}
                >
                  {ACT_LABELS[v]}
                </S.Segment>
              ))}
            </S.Segmented>
          )}
          {farTarget && !moveOn && (
            <S.Muted>
              {resolved.approachBlocked
                ? `Não há espaço livre ao lado de ${nameOf(primaryTarget)} — escolha um destino no mapa, ou ataque à distância.`
                : actKind === "attack"
                  ? `${nameOf(primaryTarget)} está a ${resolved.targetSteps} espaços — ataque à distância.`
                  : `${nameOf(primaryTarget)} está a ${resolved.targetSteps} espaços — ligue Mover para chegar até lá.`}
            </S.Muted>
          )}
          {catalogue && actKind === "attack" && (
            <S.WeaponList role="radiogroup" aria-label="Arma">
              {catalogue.weapons.map((w) => (
                <S.Weapon
                  key={w.name}
                  type="button"
                  role="radio"
                  aria-checked={selectedWeapon === w.name}
                  onClick={() => onDraftChange(setWeapon(draft, w.name))}
                >
                  <S.WeaponName>{weaponLabel(w.name)}</S.WeaponName>
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
          as={BlockableButton}
          blockedReason={unavailableReason}
          type="button"
          // Indisponível usa aria-disabled (o Tooltip explica); `disabled` não recebe foco nem toque.
          disabled={!unavailableReason && (!verdict.ready || !canDeclare)}
          onClick={onDeclare}
        >
          {declareLabel(verdict, actKind)}
        </S.DeclareButton>
        {(moveOn || actOn) && (
          <S.ClearButton type="button" onClick={() => onDraftChange({ moveMode: "none" })}>
            Limpar
          </S.ClearButton>
        )}
      </S.Footer>
      {unavailableReason ? (
        <S.Hint data-testid="composer-hint">{unavailableReason}</S.Hint>
      ) : !verdict.ready ? (
        <S.Hint data-testid="composer-hint">{NOT_READY_HINTS[verdict.reason](verb)}</S.Hint>
      ) : (
        blockedReason && <S.Hint data-testid="composer-hint">{blockedReason}</S.Hint>
      )}
    </S.Sheet>
  );
}

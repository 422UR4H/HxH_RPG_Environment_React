import styled from "styled-components";
import { colors, fonts } from "../../../styles/tokens";
import type { CombatCatalogue } from "../../../services/characterSheetsService";
import type { ActionDraft } from "./actionDraft";
import { migrateTargets } from "./actionDraft";
import type { EnqueueActionPayload, MoveCategory } from "./combatMessages";

const MOVE_CATEGORIES: MoveCategory[] = ["Dash", "Shift"];

/**
 * Bottom sheet de compor ação (T11). Sem campo de perícia — o `hit` é derivado pelo
 * servidor (§11.1 do doc mestre). Nenhum `isMaster` aqui (I2): a página decide quem pode
 * abrir isto e para qual ator.
 */
export default function ActionComposer({
  actorId,
  actorName,
  actorSlot,
  draft,
  catalogue,
  defaultCategory = "Dash",
  nameOf = (id: string) => id,
  onDraftChange,
  onSubmit,
  onClearActor,
  canSubmit = true,
}: {
  actorId: string;
  actorName: string;
  actorSlot?: [number, number, number];
  draft: ActionDraft;
  catalogue: CombatCatalogue;
  /** Exibição do radio desabilitado quando não há destino ainda — vem de `defaultMoveCategory(state)`. */
  defaultCategory?: MoveCategory;
  /** Alvos são UUIDs de sheet ou de parede (R4); isto só traduz para exibição. */
  nameOf?: (id: string) => string;
  onDraftChange: (draft: ActionDraft) => void;
  onSubmit: (payload: EnqueueActionPayload) => void;
  onClearActor?: () => void;
  /**
   * Final review, Important 2(b)/M4: a página combina "socket conectado" (status ===
   * "connected") e "sem envio do composer ainda pendente para este ator" (evita duplicar
   * o enqueue num link lento) num único booleano. Default true preserva o comportamento
   * anterior para qualquer chamador que ainda não passa isto.
   */
  canSubmit?: boolean;
}) {
  const selectedWeapon = draft.weapon ?? "Fist";
  const hasDestination = draft.move !== undefined;
  const canDeclare = (draft.targets.length > 0 || draft.move !== undefined) && canSubmit;

  function handleRemoveTarget(id: string) {
    onDraftChange(migrateTargets(draft, draft.targets.filter((t) => t !== id)));
  }

  function handleWeaponChange(name: string) {
    onDraftChange({ ...draft, weapon: name });
  }

  function handleCategoryChange(category: MoveCategory) {
    if (!draft.move) return;
    onDraftChange({ ...draft, move: { category, to: draft.move.to } });
  }

  function handleClearDestination() {
    const { move: _move, ...rest } = draft;
    onDraftChange(rest);
  }

  function handleSubmit() {
    const payload: EnqueueActionPayload = {
      actorId,
      ...(draft.targets.length ? { targetId: draft.targets } : {}),
      ...(draft.weapon || draft.targets.length
        ? { attack: { ...(draft.weapon ? { weapon: draft.weapon } : {}) } }
        : {}),
      ...(draft.move
        ? {
            move: {
              category: draft.move.category,
              ...(actorSlot ? { from: actorSlot } : {}),
              position: draft.move.to,
            },
          }
        : {}),
    };
    onSubmit(payload);
  }

  return (
    <Sheet>
      <ActorRow>
        <ActorName>{actorName}</ActorName>
        {onClearActor && (
          <ClearButton type="button" aria-label="Limpar ator" onClick={onClearActor}>
            ×
          </ClearButton>
        )}
      </ActorRow>

      <TargetList>
        {draft.targets.map((id) => {
          const label = nameOf(id);
          return (
            <TargetChip key={id}>
              <span>{label}</span>
              <ClearButton
                type="button"
                aria-label={`Remover ${label}`}
                onClick={() => handleRemoveTarget(id)}
              >
                ×
              </ClearButton>
            </TargetChip>
          );
        })}
      </TargetList>

      <Fieldset>
        <legend>Arma</legend>
        {catalogue.weapons.map((weapon) => (
          <WeaponLabel key={weapon.name}>
            <input
              type="radio"
              name="weapon"
              value={weapon.name}
              checked={selectedWeapon === weapon.name}
              onChange={() => handleWeaponChange(weapon.name)}
            />
            {weapon.name} — {weapon.dice.map((d) => `d${d}`).join("+")}
            {weapon.flatDamage ? ` +${weapon.flatDamage}` : ""} · proficiência{" "}
            {weapon.proficiencyLevel}
          </WeaponLabel>
        ))}
      </Fieldset>

      <Fieldset>
        <legend>Movimento</legend>
        {MOVE_CATEGORIES.map((category) => (
          <MoveLabel key={category}>
            <input
              type="radio"
              name="moveCategory"
              value={category}
              disabled={!hasDestination}
              checked={hasDestination ? draft.move!.category === category : defaultCategory === category}
              onChange={() => handleCategoryChange(category)}
            />
            {category}
          </MoveLabel>
        ))}
        {hasDestination ? (
          <Destination>
            Destino: ({draft.move!.to.join(", ")})
            <ClearButton type="button" aria-label="Limpar destino" onClick={handleClearDestination}>
              ×
            </ClearButton>
          </Destination>
        ) : (
          <Hint>clique num espaço livre para escolher o destino</Hint>
        )}
      </Fieldset>

      <DeclareButton type="button" disabled={!canDeclare} onClick={handleSubmit}>
        Declarar
      </DeclareButton>
    </Sheet>
  );
}

const Sheet = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: ${colors.surfaceSidebar};
  color: ${colors.textPrimary};
  font-family: ${fonts.sans};
  font-size: 13px;
`;

const ActorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: 600;
`;

const ActorName = styled.span``;

const TargetList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const TargetChip = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${colors.surfaceInput};
`;

const ClearButton = styled.button`
  border: none;
  background: transparent;
  color: ${colors.textPrimary};
  cursor: pointer;
  font-size: 13px;
  line-height: 1;
  padding: 0 2px;
`;

const Fieldset = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 4px;
  border: 1px solid ${colors.borderDivider};
  border-radius: 4px;
  padding: 8px;
`;

const WeaponLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MoveLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const Destination = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: ${colors.textMuted};
`;

const Hint = styled.div`
  color: ${colors.textPlaceholderStrong};
  font-style: italic;
`;

const DeclareButton = styled.button`
  font-family: ${fonts.sans};
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: ${colors.brandAccent};
  color: ${colors.textPrimary};

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

import { useCombatCatalogue } from "../../../hooks/useCombatCatalogue";
import { loadDraft } from "./actionDraft";
import ReactionConfigDialog from "./ReactionConfigDialog";
import type { useReactionControls } from "./useReactionControls";

/**
 * O diálogo de configurar a reação, igual nas duas telas. A configuração lista as armas do
 * personagem que reage — que pode não ser o ator do compositor — e o diálogo lê a arma
 * padrão só ao abrir, então espera o catálogo chegar.
 */
export default function ReactionDialogHost({
  token,
  matchId,
  controls,
  nameOf,
}: {
  token: string;
  matchId?: string;
  controls: Pick<ReturnType<typeof useReactionControls>, "dialog" | "sendFromDialog" | "closeDialog">;
  nameOf: (id: string) => string;
}) {
  const { dialog } = controls;
  const { data: catalogue, isLoading } = useCombatCatalogue(token, dialog?.actorId);
  if (!dialog || isLoading) return null;
  return (
    <ReactionConfigDialog
      key={`${dialog.actorId}:${dialog.initial}`}
      name={nameOf(dialog.actorId)}
      initial={dialog.initial}
      weapons={catalogue?.weapons.map((w) => w.name) ?? []}
      defaultWeapon={matchId ? loadDraft(matchId, dialog.actorId).attack?.weapon : undefined}
      onSend={controls.sendFromDialog}
      onCancel={controls.closeDialog}
    />
  );
}

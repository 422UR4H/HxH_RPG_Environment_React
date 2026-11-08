// O fluxo do diálogo "Nova cena" do mestre (spec 2026-11-08 §4): em combate, abrir pede o
// resumo; o diálogo fica aberto depois de enviar e só fecha quando a cena troca de verdade
// (scene_changed) — uma recusa do servidor aparece dentro dele.
import { useState } from "react";
import type { CombatSummary } from "../clock/clockMessages";
import type { WsError } from "./combatErrorMessages";
import type { ChangeScenePayload, SceneCategory, ScenePayload } from "./combatMessages";

export type SceneChangeFlowInput = {
  scene: ScenePayload | undefined;
  combatSummary: CombatSummary | null;
  lastError: WsError | null;
  requestCombatSummary: () => boolean;
  changeScene: (p: ChangeScenePayload) => boolean;
};

/** O que já estava no estado ao abrir: resumo e erro antigos não valem para esta abertura. */
type Snapshot = {
  summary: CombatSummary | null;
  error: WsError | null;
  sceneId: string | undefined;
  /** O resumo foi recusado (not_battle_scene): fica no layout de roleplay até fechar. */
  summaryFailed: boolean;
  /** O pedido do resumo nem saiu (socket fechado). */
  summaryOffline: boolean;
};

const SUMMARY_OFFLINE = "Sem conexão — não foi possível calcular o combate.";

export function useSceneChangeFlow({
  scene,
  combatSummary,
  lastError,
  requestCombatSummary,
  changeScene,
}: SceneChangeFlowInput) {
  const [opened, setOpened] = useState<Snapshot | null>(null);

  // A cena trocou com o diálogo aberto: deu certo, fecha (ajuste durante a renderização).
  if (opened && scene?.sceneId !== opened.sceneId) setOpened(null);

  const currentCategory: SceneCategory = scene?.category ?? "roleplay";
  const freshError = opened && lastError !== opened.error ? lastError : null;
  const summary = opened && combatSummary !== opened.summary ? combatSummary : null;
  // Fixo ao chegar: uma recusa posterior do change_scene não pode trazer o "Calculando" de volta.
  if (opened && !opened.summaryFailed && freshError?.sentType === "get_combat_summary") {
    setOpened({ ...opened, summaryFailed: true });
  }
  const summaryFailed = opened?.summaryFailed === true || freshError?.sentType === "get_combat_summary";

  return {
    open: opened != null,
    currentCategory,
    summary,
    summaryFailed,
    /** Por que o resumo não veio, quando há o que dizer (sem isso o diálogo cai no roleplay calado). */
    summaryError: opened?.summaryOffline ? SUMMARY_OFFLINE : null,
    /** Só a recusa do `change_scene` desta abertura. */
    error: freshError?.sentType === "change_scene" ? freshError : null,
    openDialog: () => {
      // Pedido que não saiu nunca terá resposta: sem isso o diálogo ficaria em "Calculando…".
      const offline = currentCategory === "battle" && !requestCombatSummary();
      setOpened({
        summary: combatSummary,
        error: lastError,
        sceneId: scene?.sceneId,
        summaryFailed: offline,
        summaryOffline: offline,
      });
    },
    closeDialog: () => setOpened(null),
    confirm: (p: ChangeScenePayload) => changeScene(p),
  };
}

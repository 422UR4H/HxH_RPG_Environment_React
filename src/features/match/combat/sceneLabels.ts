import type { SceneCategory, ScenePayload } from "./combatMessages";

/** O nome de cada categoria de cena na interface — o topo, o histórico e o diálogo usam este. */
export const SCENE_LABEL: Record<SceneCategory, string> = { battle: "Batalha", roleplay: "Roleplay" };

/** O nome da cena na mesa: a descrição inicial, senão a categoria, senão "Sem cena". */
export function sceneTitle(scene?: ScenePayload): string {
  return scene?.briefInitialDescription || (scene ? SCENE_LABEL[scene.category] : "Sem cena");
}

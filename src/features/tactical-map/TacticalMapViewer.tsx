import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  npcMap?: Map<string, CharacterPrivateSummary>;
};

export default function TacticalMapViewer({ map, width, height, npcMap }: Props) {
  return <TacticalMapStage map={map} width={width} height={height} npcMap={npcMap} />;
}

import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap, WallSegment, FogState } from "../../types/tacticalMap";
import type { CharacterPrivateSummary } from "../../types/characterSheet";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
  npcMap?: Map<string, CharacterPrivateSummary>;
  onWallClick?: (wall: WallSegment) => void;
  fog?: FogState;
  isMaster?: boolean;
};

export default function TacticalMapViewer({ map, width, height, npcMap, onWallClick, fog, isMaster }: Props) {
  return <TacticalMapStage map={map} width={width} height={height} npcMap={npcMap} walls={map.walls} onWallClick={onWallClick} fog={fog} fogDisabled={!!isMaster || !fog} />;
}

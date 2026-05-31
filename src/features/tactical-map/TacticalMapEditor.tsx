import TacticalMapStage from "../../components/organisms/TacticalMapStage";
import type { TacticalMap } from "../../types/tacticalMap";

type Props = {
  map: TacticalMap;
  width: number;
  height: number;
};

export default function TacticalMapEditor({ map, width, height }: Props) {
  return <TacticalMapStage map={map} width={width} height={height} />;
}

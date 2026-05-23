import ProgressBar from "../ions/ProgressBar";
import { colors } from "../../styles/tokens";

interface HpBarProps {
  current?: number;
  max?: number;
}

export default function HpBar({ current = 0, max = 0 }: HpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      color={colors.redHp}
    />
  );
}

import ProgressBar from "../ions/ProgressBar";
import { colors } from "../../styles/tokens";

interface SpBarProps {
  current?: number;
  max?: number;
}

export default function SpBar({ current = 0, max = 0 }: SpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      color={colors.brandAccentBright}
    />
  );
}

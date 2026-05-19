import ProgressBar from "../ions/ProgressBar";

interface SpBarProps {
  current?: number;
  max?: number;
}

export default function SpBar({ current = 0, max = 0 }: SpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      // label="Stamina"
      // color="#2ecc71"
      color="#088E3B"
    />
  );
}

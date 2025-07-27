import ProgressBar from "../ions/ProgressBar";

interface SpBarProps {
  current: number;
  max: number;
  height?: string;
}

export default function SpBar({ current, max, height = "24px" }: SpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      // label="Stamina"
      color="#2ecc71"
      height={height}
    />
  );
}

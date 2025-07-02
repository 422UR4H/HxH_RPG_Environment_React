import ProgressBar from "../ions/ProgressBar";

interface SpBarProps {
  current: number;
  max: number;
}

export default function SpBar({ current, max }: SpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      // label="Stamina"
      color="#2ecc71"
      height="24px"
    />
  );
}

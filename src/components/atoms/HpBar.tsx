import ProgressBar from "../ions/ProgressBar";

interface HpBarProps {
  current: number;
  max: number;
  height?: string;
}

export default function HpBar({ current, max, height = "24px" }: HpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      // label="Vida"
      color="#e74c3c"
      height={height}
    />
  );
}

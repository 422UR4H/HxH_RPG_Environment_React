import ProgressBar from "../ions/ProgressBar";

interface HpBarProps {
  current: number;
  max: number;
  height?: string;
}

export default function HpBar({ current, max, height }: HpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      // label="Vida"
      // color="#e74c3c"
      color="#B61B40"
      height={height}
    />
  );
}

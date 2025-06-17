import ProgressBar from "../atoms/ProgressBar";

interface HpBarProps {
  current: number;
  max: number;
}

export default function HpBar({ current, max }: HpBarProps) {
  return (
    <ProgressBar
      current={current}
      max={max}
      // label="Vida"
      color="#e74c3c"
      height="24px"
    />
  );
}

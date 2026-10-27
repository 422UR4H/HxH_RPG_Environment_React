interface ErrorIconProps {
  size: number;
}

// Círculo com exclamação; herda a cor do texto (currentColor).
export default function ErrorIcon({ size }: ErrorIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden="true">
      <circle cx="22" cy="22" r="19" stroke="currentColor" strokeWidth="3" />
      <path d="M22 12v12" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="22" cy="31" r="2.2" fill="currentColor" />
    </svg>
  );
}

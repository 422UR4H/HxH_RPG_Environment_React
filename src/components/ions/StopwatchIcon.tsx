/**
 * Cronômetro desenhado à mão: botão da coroa no topo, corpo redondo e um ponteiro. Herda a cor
 * do texto (`currentColor`). Decorativo — quem o usa dá o rótulo.
 */
export default function StopwatchIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* coroa: botão e haste */}
      <path d="M10 2.5h4" />
      <path d="M12 2.5v2.5" />
      {/* botão lateral, o que dá a cara de cronômetro e não de relógio */}
      <path d="M18.4 5.6l1.4 1.4" />
      {/* corpo */}
      <circle cx="12" cy="13.5" r="8" />
      {/* ponteiro */}
      <path d="M12 13.5V9" />
      <path d="M12 13.5l2.6 2" />
    </svg>
  );
}

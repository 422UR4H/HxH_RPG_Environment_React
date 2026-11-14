import { alpha, colors } from "./tokens";

// O realce de um alvo de soltura (arrastar uma peça para fora do mapa): o roster do lobby e a
// lista de Personagens da mesa usam o mesmo.
export const dropTargetBorderColor = (active: boolean): string => (active ? colors.brandAccent : "transparent");
export const dropTargetBackground = (active: boolean): string =>
  active ? alpha(colors.brandAccent, 0.05) : "transparent";

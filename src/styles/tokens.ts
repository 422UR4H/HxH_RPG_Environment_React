// Design tokens — semantic. Phase 3 of the componentization refactor.
// One token per distinct value. To rebrand, edit here.

export const colors = {
  // brand
  brandPrimary: "#08491f", // page header green
  brandAccent: "#107135", // interactive green: buttons, focus rings, submit

  // surfaces
  surfaceSidebar: "#2d2215", // character/rules sidebar background
  surfaceInput: "#493823", // form field background, rule-section background
  surfaceScrollTrack: "#42331f", // webkit scrollbar track
  surfaceScrollThumbHover: "#5a4529", // webkit scrollbar thumb on hover

  // borders
  borderInput: "#604d31",
  borderDivider: "#696969",
  accentDanger: "#ff1c1c", // danger accent border / alert text

  // text
  textPrimary: "white",
  textMuted: "#e0e0e0",
  textDisabled: "#ccc",
  textOnLight: "black",

  // actions
  submitDisabled: "#7a5618",
  orangeStart: "#ffa216", // create-button orange gradient start
  orangeEnd: "#e60000", // create-button orange gradient end

  // domain status
  statusScheduled: "#b8860b",
  statusOngoing: "#27ae60",
  statusEnded: "#7d3030",
  statusPending: "#3498db",
  statusNpc: "#2ecc71",
  statusLeft: "#555",

  // feedback
  danger: "#e74c3c",
  errorBg: "rgba(231, 76, 60, 0.2)",
  errorBgSoft: "rgba(231, 76, 60, 0.1)",

  // surfaces — translucent
  overlay: "rgba(0, 0, 0, 0.7)",
  overlaySoft: "rgba(0, 0, 0, 0.44)",

  // shadows
  shadowSoft: "rgba(0, 0, 0, 0.3)",
  shadowStrong: "rgba(0, 0, 0, 0.4)",
} as const;

export const fonts = {
  sans: '"Roboto", sans-serif',
  display: '"Oswald", sans-serif',
} as const;

// Design tokens — semantic. Phase 3 + Phase 5 of the componentization refactor.
// One token per distinct value. To rebrand, edit here.

export const colors = {
  // brand
  brandPrimary: "#08491f", // page header green
  brandAccent: "#107135", // interactive green: buttons, focus rings, submit
  brandAccentBright: "#088e3b", // focus border variants, SP bar full color

  // surfaces — opaque
  surfaceSidebar: "#2d2215", // character/rules sidebar background
  surfaceInput: "#493823", // form field background, rule-section background
  surfaceInputHover: "#382a1a", // match item hover
  surfaceScrollTrack: "#42331f", // webkit scrollbar track
  surfaceScrollThumbHover: "#5a4529", // webkit scrollbar thumb on hover
  surfaceMuted: "#333", // fallback dark card (participant without private data)
  surfaceControl: "#444", // inner control surface: progress bar fill bg, attribute card bg
  surfaceHeaderDefault: "#252525", // PageHeader default background

  // surfaces — neutral scale (top-bar/menu/modal panels)
  grayBgDark: "#222", // ExpBar dark background
  grayBgDeeper: "#1a1a1a", // ImagePickerModal preview surface
  grayBgPanel: "#1c1c1c", // ManageButton panel surface
  grayBgModal: "#2a2a2a", // ImagePickerModal modal surface, ManageButton item hover

  // borders / dividers
  borderInput: "#604d31",
  borderDivider: "#696969",
  grayMid: "#555", // multi-use neutral: border, secondary bg
  grayMidStrong: "#666", // border + neutral text in drop zones
  borderGrayLight: "#777", // BackgroundButton resting border
  accentDanger: "#ff1c1c", // danger accent border / alert text

  // text
  textPrimary: "white",
  textMuted: "#e0e0e0",
  textDisabled: "#ccc",
  textOnLight: "black",
  textPlaceholder: "#888", // form labels, drop zone caption
  textPlaceholderStrong: "#aaa", // inactive tab text, helper text
  textInputDisabled: "#9f9f9f", // disabled / empty input placeholder
  textLabelMuted: "#b1b1b1", // attribute group labels

  // actions
  submitDisabled: "#7a5618",
  orange: "#ffa216", // standalone orange: item borders, badges
  actionBlue: "#1877f2", // Facebook-style action button
  actionBlueHover: "#0052cc", // actionBlue hover
  disabledBlue: "#83b4ef", // disabled fill on action buttons
  linkBlue: "#2e5397", // sign pages link / footer text

  // domain status
  statusScheduled: "#b8860b",
  statusOngoing: "#27ae60",
  statusEnded: "#7d3030",
  statusPending: "#3498db",
  statusNpc: "#2ecc71",
  statusLeft: "#555", // same value as grayMid; kept semantic for rebrand independence

  // feedback
  danger: "#e74c3c",
  dangerDark: "#c0392b", // confirm-dialog danger button, reject button
  dangerLight: "#f38ba8", // danger menu item text
  errorBg: "rgba(231, 76, 60, 0.2)",
  errorBgSoft: "rgba(231, 76, 60, 0.1)",
  errorBgFaint: "rgba(231, 76, 60, 0.08)",
  redHp: "#b61b40", // HP bar fill, remove-action button
  redInputError: "#b91a40", // input field error border
  redCardAccent: "#ba1a3e", // character-sheet-card hover/active accent
  redExpDefault: "#ef4444", // ExpBar default color prop

  // gold / warning
  goldExp: "#d4af37", // character exp bar fill
  goldStar: "#f0c040", // rating star
  warningText: "#ffc107", // warning text in image picker
  warningBorder: "#a07000", // warning border / pill bg
  warningBgDark: "#3a2a00", // warning notice background

  // surfaces — translucent
  overlay: "rgba(0, 0, 0, 0.7)",
  overlaySoft: "rgba(0, 0, 0, 0.44)",
  overlayMedium: "rgba(0, 0, 0, 0.6)",
  overlayDark: "rgba(0, 0, 0, 0.85)",

  // shadows
  shadowSoft: "rgba(0, 0, 0, 0.3)",
  shadowStrong: "rgba(0, 0, 0, 0.4)",
  shadowMedium: "rgba(0, 0, 0, 0.5)",
  shadowText: "rgba(0, 0, 0, 0.9)", // text shadow on exp bar
  fadeSurfaceInput: "rgba(73, 56, 35, 0.9)", // expandable-text fade matched to surfaceInput
} as const;

export const fonts = {
  sans: '"Roboto", sans-serif',
  display: '"Oswald", sans-serif',
} as const;

// Gradients are single, atomic design decisions — one token per gradient,
// not one per color stop.
export const gradients = {
  // "orange" CreateButton / submit variant background
  orange: `linear-gradient(to bottom, ${colors.orange} 0%, ${colors.orange} 20%, #e60000 100%)`,
  // SignPages (login/register) page background
  signBg: `linear-gradient(to bottom, #4b70a4 0%, ${colors.linkBlue} 100%)`,
} as const;

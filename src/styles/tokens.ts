// Design tokens em duas camadas. Regras e fluxo para cor nova: src/styles/CLAUDE.md.
//
// 1. `palette`  — o ÚNICO lugar com hex/rgba. Nome = matiz + intensidade. Componentes não importam.
// 2. `colors`   — semântica: o que os componentes usam. Nome = papel, com prefixo de um grupo fechado
//                 (brand, surface, text, border, action, feedback, status, vital, map, overlay, shadow).
//                 Dois papéis podem apontar para a mesma cor da palette: é isso que deixa um mudar
//                 sem caçar os usos do outro.

export const palette = {
  // neutros
  neutral0: "#ffffff",
  neutral100: "#e0e0e0",
  neutral200: "#cccccc",
  neutral300: "#aaaaaa",
  neutral400: "#888888",
  neutral500: "#666666",
  neutral600: "#555555",
  neutral700: "#444444",
  neutral800: "#333333",
  neutral850: "#252525",
  neutral900: "#1c1c1c",
  neutral1000: "#000000",

  // marrons dos painéis
  brown500: "#604d31",
  brown600: "#5a4529",
  brown700: "#493823",
  brown850: "#382a1a",
  brown900: "#2d2215",

  // verdes: 4 variações (escuro do cabeçalho, brand, intermediário, saturado)
  green900: "#08491f", // cabeçalho; reservado a outros usos escuros
  green700: "#107135", // brand
  green600: "#11a235",
  green500: "#12d335", // saturado

  // vermelhos
  red800: "#ba1a3e", // brand
  red700: "#d01334",
  red600: "#e70a27", // saturado
  red500: "#ff0015", // saturado máximo
  coral500: "#ff6b4a",

  // laranja / âmbar / dourado
  orange500: "#ffa216",
  amber600: "#b8860b",
  amber700: "#a07000",
  amber800: "#7a5618",
  amber900: "#3a2a00",
  gold700: "#d4af37", // brand
  gold600: "#e2b525",
  gold500: "#f0bc13", // saturado
  gold400: "#ffc300", // saturado máximo
  ochre700: "#a16207",

  // azuis: 4 variações
  blue700: "#2e5397", // brand
  blue600: "#4b70a4", // brand claro (degradê do login)
  blue500: "#3184ee",
  blue400: "#4da3ff", // saturado (mana)
  navy950: "#0b1220",
  slate400: "#94a3b8",
  slate500: "#64748b",
  purple500: "#a855f7",
} as const;

/** `alpha(colors.feedbackDanger, 0.2)` → `rgba(255, 28, 28, 0.2)`. Só aceita hex de 6 dígitos. */
export function alpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export const colors = {
  // brand
  brandPrimary: palette.green900, // cabeçalho verde das páginas
  brandAccent: palette.green700, // verde interativo: botões, anéis e bordas de foco, submit

  // surface — opacas
  surfaceSidebar: palette.brown900, // fundo da sidebar de personagens/regras
  surfaceInput: palette.brown700, // fundo de campo de formulário e de seção de regra
  surfaceInputHover: palette.brown850, // hover de item de partida
  surfaceScrollTrack: palette.brown700, // trilho da scrollbar (tema earth)
  surfaceScrollThumbHover: palette.brown600, // polegar da scrollbar no hover (tema earth)
  surfaceScrollThumbAccent: palette.red800, // polegar da scrollbar (tema dark, o global)
  surfaceScrollThumbAccentHover: palette.red600, // polegar da scrollbar (tema dark) no hover
  surfaceMuted: palette.neutral800, // cartão escuro de reserva (participante sem dados privados)
  surfaceControl: palette.neutral700, // superfície interna de controle: fundo da barra, card de atributo
  surfaceNeutral: palette.neutral600, // fundo neutro secundário: trilho da barra de EXP, campos de perfil
  surfaceNeutralHover: palette.neutral500, // hover do fundo neutro (BackgroundButton)
  surfaceHeaderDefault: palette.neutral850, // fundo padrão do PageHeader
  surfaceHeaderDark: palette.neutral1000, // PageHeader em páginas escuras (home, fichas)
  surfaceBar: palette.neutral850, // fundo escuro da barra de EXP
  surfaceDeep: palette.neutral900, // prévia do ImagePickerModal, trilho da scrollbar dark
  surfacePanel: palette.neutral900, // painel do ManageButton
  surfaceModal: palette.neutral850, // modal do ImagePickerModal, hover de item do ManageButton
  surfaceFade: alpha(palette.brown700, 0.9), // degradê do texto expansível, casado com surfaceInput
  surfaceActorRow: alpha(palette.green500, 0.25), // linha de ordem destacada do ator no combate

  // text
  textPrimary: palette.neutral0,
  textMuted: palette.neutral100,
  textDisabled: palette.neutral200,
  textOnLight: palette.neutral1000,
  textPlaceholder: palette.neutral400, // rótulos de formulário, legenda da área de soltar
  textPlaceholderStrong: palette.neutral300, // aba inativa, texto de ajuda
  textInputDisabled: palette.neutral300, // campo desabilitado ou vazio
  textLabelMuted: palette.neutral300, // rótulos dos grupos de atributos
  textFaint: palette.neutral600, // opção desabilitada de lista
  textHint: palette.neutral500, // legenda e dica nas áreas de soltar
  textLinkOnLight: palette.blue700, // links sobre fundo branco (telas de login e cadastro)

  // border
  borderInput: palette.brown500,
  borderDivider: palette.neutral500,
  borderMuted: palette.neutral600, // borda neutra de uso geral
  borderStrong: palette.neutral500, // borda e texto neutro nas áreas de soltar
  borderLight: palette.neutral400, // borda em repouso do BackgroundButton
  borderAccent: palette.red800, // borda de destaque: hover/ativo dos cards de ficha e de navegação

  // action
  actionAccent: palette.orange500, // borda de item aberto, variante laranja dos botões
  actionDisabled: palette.amber800, // submit desabilitado
  actionHighlight: palette.gold700, // controles do header (seta, logo): halo do hover e anel de foco
  actionDestructive: palette.red800, // botões que removem, excluem, rejeitam ou saem

  // feedback
  feedbackDanger: palette.red600, // erro, alerta, perigo, falha em combate
  feedbackInputError: palette.red800, // borda de campo com erro, aviso de erro nas telas de login
  feedbackWarning: palette.gold400, // texto de aviso no seletor de imagem
  feedbackWarningBorder: palette.amber700, // borda e pílula de aviso
  feedbackWarningBg: palette.amber900, // fundo do aviso

  // status
  statusScheduled: palette.amber600,
  statusOngoing: palette.green700, // em andamento, NPC, aceitar (fundo de pílula com texto branco)
  statusPublic: palette.green500, // campanha pública: texto sobre fundo escuro
  statusEnded: palette.red800,
  statusLeft: palette.neutral600,
  statusPending: palette.blue700,
  statusRating: palette.gold400, // estrela de avaliação

  // vital — esquemáticas da ficha
  vitalHp: palette.red600,
  vitalSp: palette.green500,
  vitalExp: palette.gold400, // barra de EXP do personagem
  vitalSkillExp: palette.red600, // barra de EXP de habilidade e atributo
  vitalPoints: palette.green500, // pontos a distribuir

  // map — mapa tático (as cores do Pixi entram por aqui; converta com parseInt(hex.slice(1), 16))
  mapSelectionRing: palette.gold400, // anel da peça selecionada
  mapTargetRing: palette.coral500, // anel do alvo em combate: o matiz do ataque, distinto do dourado da seleção
  mapInspectRing: palette.neutral300, // anel de "só olhando" (F7): neutro, nunca o dourado do ator
  // movimento = azul-ciano: complementar do laranja do ataque (mapAttackIntent) e seguro p/ daltonismo
  // vs laranja-avermelhado; é a convenção do gênero; o verde já significa "turno aberto" (mapActiveTurn)
  // e some em mapas de grama. Também é o tint de "mover" no composer e do fantasma de intenção declarada (§8).
  mapMoveIntent: palette.blue400,
  mapIntentOutline: palette.navy950, // contorno escuro sob os traços de movimento (legível sobre qualquer terreno)
  mapStackBadge: palette.neutral900, // fundo do selo ×N da cascata (§7.2)
  mapAttackIntent: palette.coral500, // ataque em composição: linha ator→alvo, tint do composer
  mapActiveTurn: palette.green500, // anel da peça cujo turno está aberto
  mapSlotHover: palette.neutral0, // casa sob o ponteiro durante a composição (desenhada com alpha baixo)
  mapSlotValid: palette.green500, // casa livre/válida ao arrastar ou posicionar
  mapSlotInvalid: palette.red600, // casa ocupada ou fora do tabuleiro
  mapStageBg: palette.navy950, // fundo do palco Pixi
  mapFog: palette.neutral1000, // névoa
  mapMask: palette.neutral0, // cor técnica de máscara/stencil (nunca aparece)
  mapHandleFill: palette.neutral0, // alças de redimensionar e bordas do fundo
  mapHandleStroke: palette.neutral800, // contorno das alças
  mapHandleRotate: palette.gold400, // alça de rotação
  mapHandleSkew: palette.orange500, // alças em modo skew (Shift)
  mapWallStone: palette.slate400,
  mapWallWood: palette.ochre700,
  mapWallIron: palette.slate500,
  mapWallMagical: palette.purple500,
  mapWallGlow: palette.neutral0, // brilho e alças da parede
  mapWallMidpoint: palette.gold400, // ponto médio da parede selecionada
  mapPieceShadow: palette.neutral1000, // sombra projetada da peça e do rótulo
  mapPieceFallback: palette.neutral850, // peça sem avatar
  mapPieceLabel: palette.neutral0, // texto sobre a peça (nível, altura)

  // overlay
  overlay: alpha(palette.neutral1000, 0.7),
  overlaySoft: alpha(palette.neutral1000, 0.44),
  overlayMedium: alpha(palette.neutral1000, 0.6),
  overlayDark: alpha(palette.neutral1000, 0.85),
  overlayScrim: alpha(palette.neutral1000, 0.32), // véu do painel/gaveta em tela estreita
  overlayStage: alpha(palette.navy950, 0.85), // véu de carregamento do palco do mapa
  overlayHighlight: alpha(palette.neutral0, 0.14), // contorno e brilho sutil sobre fundo escuro
  overlayHighlightFaint: alpha(palette.neutral0, 0.05),
  overlayLightStrong: alpha(palette.neutral0, 0.6), // texto/borda claros translúcidos

  // shadow
  shadowSoft: alpha(palette.neutral1000, 0.3),
  shadowStrong: alpha(palette.neutral1000, 0.4),
  shadowText: alpha(palette.neutral1000, 0.9), // sombra de texto sobre a barra de EXP
} as const;

export const fonts = {
  sans: '"Roboto", sans-serif',
  display: '"Oswald", sans-serif',
} as const;

// Gradientes são uma decisão de design só — um token por gradiente, não um por cor-stop.
export const gradients = {
  // botões laranja (CreateButton / submit)
  orange: `linear-gradient(to bottom, ${palette.orange500} 0%, ${palette.orange500} 20%, ${palette.red600} 100%)`,
  // fundo das telas de login e cadastro
  signBg: `linear-gradient(to bottom, ${palette.blue600} 0%, ${palette.blue700} 100%)`,
  // véu sob o texto de um card com imagem de fundo: limpo no topo, escuro onde o texto fica
  cardScrim: `linear-gradient(to bottom, transparent 30%, ${colors.overlaySoft} 55%, ${colors.overlayDark} 100%)`,
} as const;

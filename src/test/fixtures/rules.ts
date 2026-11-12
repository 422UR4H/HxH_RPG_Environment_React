import type { RuleChapter } from "../../types/rules";

// Corpo de GET /rules/character-sheet (campo `chapters`), curto mas realista.
// B6/B7 dependem disto: fence de diagrama, h2 "Visão Geral", links entre capítulos,
// âncora, fórmula, nota e tabela ficam todos em "atributos".
export const sheetRulesFixture: RuleChapter[] = [
  {
    slug: "criacao",
    label: "Criação",
    title: "Criando seu personagem",
    markdown: [
      "Criar uma ficha leva cinco passos, na ordem em que aparecem na tela.",
      "",
      "1. **Preencha o perfil**: apelido, nome e data de nascimento.",
      "2. **Escolha uma classe**: veja [Classes](../classes.md).",
      "3. **Distribua os pontos**: veja [Atributos](./atributos.md).",
    ].join("\n"),
    comingSoon: false,
  },
  {
    slug: "atributos",
    label: "Atributos",
    title: "Atributos",
    markdown: [
      "## Visão Geral",
      "",
      "Os atributos físicos e mentais medem o que seu personagem consegue fazer.",
      "",
      "```diagram physical paint=RES,AGI,Str,AGI-Str,Str-RES",
      "      RES",
      "     /   \\",
      "   AGI---Str",
      "```",
      "",
      "## Distribuição de Pontos",
      "",
      "Veja também [Classes](../classes.md) e os [pontos](./atributos.md#distribuicao-de-pontos).",
      "",
      "> **Poder** = Força × 2 + Resistência",
      "",
      "> *Dica: gaste os pontos primeiro no atributo da sua classe.*",
      "",
      "| Atributo | Sigla |",
      "|---|---|",
      "| Força | Str |",
      "| Agilidade | AGI |",
    ].join("\n"),
    comingSoon: false,
  },
  {
    slug: "sistema-nen",
    label: "Nen",
    title: "Sistema Nen",
    markdown: "Em breve.",
    comingSoon: true,
  },
];

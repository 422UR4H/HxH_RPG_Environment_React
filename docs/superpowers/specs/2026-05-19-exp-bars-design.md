# Design: Barras de EXP na CharacterSheet

**Data:** 2026-05-19
**Escopo:** Frontend (`System_X_System_React`)
**Seção afetada:** PERÍCIAS (direita da ficha) — skills, atributos, proficiências

---

## 1. Contexto

A API já envia `curr_exp` e `next_lvl_base_exp` para todos os elementos com experiência
(`ExperienceResponse` no backend). O frontend não mapeava esses campos nos tipos TypeScript —
eles chegavam via `objToCamelCase` mas eram descartados por falta de tipagem.

O objetivo é exibir uma barra de EXP fina e discreta na base de cada **skill**, de cada
**grupo de atributo** (logo abaixo do header) e de cada **proficiência**, na visualização
da ficha. A barra mostra o progresso relativo dentro do nível atual (`currExp / nextLvlBaseExp`),
nunca o valor agregado.

---

## 2. Tipos (`src/types/characterSheet.ts`)

Adicionar `currExp` e `nextLvlBaseExp` (opcionais) nas interfaces abaixo. Não requer
mudança em services ou hooks — `objToCamelCase` já converte os campos.

```ts
Skill            → + currExp?: number; nextLvlBaseExp?: number
Attribute        → + currExp?: number; nextLvlBaseExp?: number
Proficiency      → + currExp?: number; nextLvlBaseExp?: number
JointProficiency → + currExp?: number; nextLvlBaseExp?: number
```

---

## 3. Novo componente: `ExpBar` (`src/components/ions/ExpBar.tsx`)

### Props

```ts
interface ExpBarProps {
  currExp: number;
  maxExp: number;
  color?: string; // default: '#ef4444'
}
```

> O `border-radius` da barra nunca é explícito: cada card pai recebe `overflow: hidden`
> durante o refactor, e o browser clipa a barra automaticamente. Isso elimina um prop e
> uma fonte de inconsistência.

### Comportamento

| Situação | Resultado |
|---|---|
| `currExp > 0`, hover (desktop) | Tooltip `currExp/maxExp` aparece centralizado acima da barra |
| `currExp > 0`, long press ≥ 400ms (mobile) | Idem |
| `currExp === 0` | Barra renderiza em 0%, tooltip **nunca** aparece |
| `touchmove` ou `touchend` antes de 400ms | Timer cancelado, sem tooltip |

### Implementação interna

- `useState<boolean>` para `tooltipVisible`
- `useRef<ReturnType<typeof setTimeout>>` para o timer do long press
- Handlers: `onMouseEnter`, `onMouseLeave`, `onTouchStart`, `onTouchEnd`, `onTouchMove`
- Tooltip: `position: absolute`, `bottom: calc(100% + 4px)`, `left: 50%`, `transform: translateX(-50%)`
- Barra: altura `4px`, background `#555`, fill `background-color: color`, `transition: width 0.3s`
- Container: `position: relative`, `overflow: visible` (para o tooltip não ser cortado)

---

## 4. Refactor: `AttributeSkillGroup`

### Posicionamento das barras

```
AttributeSkillContainer (border-radius: 8px, overflow: hidden)
  AttributeSectionTitle   ← "Resistance  Lv 42"  (adicionar "Lv" antes do power)
  ExpBar                  ← barra do atributo (bottomRadius: '0', full width)
  SkillsSubList (grid)
    SkillCard × N         ← cada card com ExpBar flush na base
```

### Novos props em `AttributeSkillGroup`

```ts
attributeCurrExp?: number;
attributeNextLvlBaseExp?: number;
```

### Extração de `SkillCard`

Extrair sub-componente `SkillCard` (interno ao arquivo ou arquivo próprio se > 80 linhas):

```ts
interface SkillCardProps {
  name: string;
  value: number;
  level: number;
  currExp?: number;
  nextLvlBaseExp?: number;
}
```

Renderiza: nome, valor, nível, e `ExpBar` flush na base. O container do `SkillCard` recebe
`overflow: hidden` para que o `ExpBar` respeite o `border-radius: 6px` do card sem precisar
de radius explícito na barra — mesmo padrão já usado no `AttributeSkillContainer` pai.

### Propagação em `PhysicalSkillsGroup` e `SpiritualSkillsGroup`

Sem mudança de assinatura — já recebem `attributes?: Record<string, Attribute>`.
Cada `AttributeSkillGroup` recebe:
```tsx
attributeCurrExp={attributes?.["resistance"]?.currExp}
attributeNextLvlBaseExp={attributes?.["resistance"]?.nextLvlBaseExp}
```

---

## 5. Refactor: `ProficienciesList`

### Tipo de `commonProfs`

```ts
// antes:
commonProfs?: Record<string, { level: number }>;
// depois:
commonProfs?: Record<string, Proficiency>;
```

### Extração de sub-componentes

| Componente | Props | Tem ExpBar? |
|---|---|---|
| `ProficiencyCard` | `name`, `level`, `currExp?`, `nextLvlBaseExp?` | Sim |
| `JointProficiencyCard` | `name`, `level`, `currExp?`, `nextLvlBaseExp?` | Sim |
| `DistributionSlot` | permanece inline | Não (create-only, sem exp real) |

Cada card: `flex-direction: column`, `overflow: hidden`, `ExpBar` como último filho.

---

## 6. Testes (`src/features/sheet/__tests__/`)

### `ExpBar.test.tsx` — TDD (escritos antes da implementação)

| Teste | Tipo |
|---|---|
| Renderiza barra com largura proporcional a `currExp/maxExp` | Comportamento |
| Tooltip aparece no `mouseenter` quando `currExp > 0` | Comportamento |
| Tooltip some no `mouseleave` | Comportamento |
| Tooltip **não aparece** quando `currExp === 0` mesmo com hover | Edge case |
| Tooltip aparece após 400ms de `touchstart` | Timer (vi.useFakeTimers) |
| `touchend` antes de 400ms cancela o timer | Timer (vi.useFakeTimers) |
| `touchmove` antes de 400ms cancela o timer | Timer (vi.useFakeTimers) |

### Testes de regressão em `ProficienciesList.test.tsx`

Os 4 testes existentes (slot behavior) devem passar **antes e depois** do refactor sem
alteração. São a rede de segurança para o Boy Scout refactor.

---

## 7. Critérios de conclusão

- [ ] Todos os testes novos (`ExpBar.test.tsx`) passando
- [ ] Todos os testes existentes (`ProficienciesList.test.tsx`) ainda passando após refactor
- [ ] TypeScript build limpo (`npm run build`)
- [ ] Lint limpo (`npm run lint`)
- [ ] Barras visíveis na ficha em modo **view** (dados reais de `currExp`/`nextLvlBaseExp`)
- [ ] Tooltip funcional em desktop (hover) e mobile (long press ≥ 400ms)
- [ ] Tooltip ausente quando `currExp === 0`
- [ ] "Lv" adicionado antes do valor de power no header do atributo

---

## 8. Fora de escopo

- Barras de EXP na seção de ATRIBUTOS (diagramas físico/mental/espiritual)
- Barras de EXP do Talent e CharacterExp global (já existem comentadas no template)
- Modo create/edit: exp bars só fazem sentido em **view** — em create/edit os valores são 0
- Animação de tooltip (fade/slide)

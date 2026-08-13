# Fechamento indevido do modal de imagem ao arrastar — design

**Data:** 2026-08-13
**Status:** aprovado

## Problema

Ao redimensionar/cortar uma imagem em `ImagePickerModal` (avatar e capa da ficha de
personagem) arrastando a partir de um dos handles do cropper, se o mouse sai da área do
modal e o botão é solto fora dele, o modal fecha — perdendo o progresso do usuário (upload
e recorte). O comportamento de "clicar fora fecha" existe de propósito, mas está sendo
disparado por um gesto que não é um clique legítimo.

Além disso, mesmo o clique-fora legítimo e o botão "Cancelar" fecham o modal
incondicionalmente, mesmo depois que o usuário já subiu/recortou uma imagem — sem nenhuma
confirmação, tornando fácil perder trabalho por engano.

## Causa raiz

`react-advanced-cropper` liga o drag dos handles a listeners de `mousemove`/`mouseup` no
`window` (propositalmente — é o que permite continuar arrastando mesmo saindo da área do
cropper). O bug não está aí.

O fechamento por clique-fora é implementado assim (idêntico em `ImagePickerModal.tsx` e em
`BackgroundEditorModal.tsx`):

```tsx
<Overlay onClick={onClose}>
  <Modal onClick={(e) => e.stopPropagation()}>
```

O evento nativo `click` do browser dispara no ancestral comum mais próximo entre o alvo do
`mousedown` e o alvo do `mouseup`. Ao pressionar em um handle (dentro de `Modal`) e soltar
fora dele, esse ancestral comum é o próprio `Overlay` — o `click` nunca passa por dentro de
`Modal`, então o `stopPropagation()` do `Modal` nunca chega a rodar. O gesto de
redimensionar é lido como "cliquei fora".

`BackgroundEditorModal.tsx` tem exatamente o mesmo padrão `Overlay`/`Modal` copiado e a
mesma falha latente (menos visível, pois não tem handle de drag, mas selecionar texto no
textarea e soltar o botão fora do modal reproduz o mesmo bug).

## Design

### 1. Fechamento por clique-fora: parar de confiar no evento `click` sintético

Rastrear o alvo do `mousedown` e do `mouseup` diretamente no backdrop, exigindo que **ambos**
aterrissem no próprio `Overlay` (não em um filho que borbulhou):

```tsx
const overlayMouseDown = useRef(false);

<Overlay
  onMouseDown={(e) => { overlayMouseDown.current = e.target === e.currentTarget; }}
  onMouseUp={(e) => {
    if (overlayMouseDown.current && e.target === e.currentTarget) attemptClose();
    overlayMouseDown.current = false;
  }}
>
```

Um drag iniciado dentro de `Modal` nunca arma a flag, então soltar fora nunca fecha o modal
— independente de até onde o drag global do cropper deixe o mouse ir. Um clique genuíno em
área vazia continua funcionando normalmente (mousedown e mouseup no mesmo `Overlay`).

Extrair essa lógica para um hook compartilhado `src/hooks/useBackdropDismiss.ts`
(`(close: () => void) => { onMouseDown, onMouseUp }`) e usá-lo tanto em `ImagePickerModal`
quanto em `BackgroundEditorModal` — duas chamadoras independentes precisando da mesma lógica
não-trivial é o próprio critério de "promote, don't duplicate" já adotado no repo
(`src/components/CLAUDE.md`).

### 2. Guarda de estado sujo (dirty) antes de fechar

Hoje `Cancelar` e o clique-fora fecham incondicionalmente, mesmo com uma imagem já
recortada. Aplicar o mesmo padrão `attemptClose` + `ConfirmDialog` que
`BackgroundEditorModal` já usa (reaproveitando o `ConfirmDialog` existente, sem componente
novo):

- **Nada foi adicionado ainda** (`!hasPendingContent`): clique-fora fecha direto, sem
  fricção — preserva o caso comum de "cliquei fora sem querer, não tenho nada a perder".
- **Algo foi adicionado** (imagem recortada ou URL preenchida): clique-fora, o botão
  `Cancelar` e a tecla Escape (nova — `ImagePickerModal` hoje não trata Escape, ao contrário
  do modal irmão) passam a chamar `attemptClose`, que abre `ConfirmDialog`
  ("Descartar imagem?" / Descartar / Continuar editando) em vez de fechar direto.

Isso resolve o cenário relatado (perder o crop arrastando o handle) e também o cenário
adjacente (clique acidental em "Cancelar" depois de já ter subido a imagem), mantendo
consistência com o padrão já estabelecido no app para "descartar alterações".

### 3. Escopo

Only `ImagePickerModal` (avatar/capa) e `BackgroundEditorModal` usam esse padrão
`Overlay`/`Modal` bespoke com drag ou conteúdo editável dentro. `ConfirmDialog` também usa
`Overlay onClick={onCancel}`, mas não tem elementos arrastáveis dentro — fora do escopo
deste fix (não reproduz o bug relatado), não será alterado.

`BgImagePanel.tsx` (upload de imagem de fundo do mapa tático) não usa
`react-advanced-cropper` nem é um modal — não afetado.

### 4. Testes

Não existe cobertura hoje para `ImagePickerModal` nem para a interação de crop. Seguindo o
precedente já criado por `BackgroundEditorModal.test.tsx` (teste direto de molecule para
esse formato de modal, em vez de só integração de página — simular um drag real de handle
do cropper através de uma página inteira com MSW seria desproporcional):

- `src/hooks/__tests__/useBackdropDismiss.test.ts` — teste puro do hook: mousedown + mouseup
  ambos no backdrop fecha; mousedown no backdrop + mouseup em filho não fecha; mousedown em
  filho não fecha, independente de onde o mouseup aterrissa.
- `src/components/molecules/__tests__/ImagePickerModal.test.tsx` — reproduz o bug relatado
  (mousedown em elemento filho, mouseup no overlay → `onClose` não é chamado), confirma que
  o clique-fora legítimo ainda funciona quando vazio, e confirma o gate do `ConfirmDialog`
  quando dirty (clique-fora, Cancelar, Escape).
- `BackgroundEditorModal.test.tsx` existente: revisar após a migração para o hook
  compartilhado; comportamento observável não muda, mas os testes de clique-fora
  (inexistentes hoje) podem ser adicionados ali também.

## Fora de escopo

- Unificar `Overlay`/`Modal` em um componente `Modal` compartilhado (larguras, paddings e
  animações diferem por modal) — o refactor aqui se limita à lógica de detecção de
  clique-fora, não à estrutura visual.
- Alterar `ConfirmDialog` (não reproduz o bug, ver seção 3).

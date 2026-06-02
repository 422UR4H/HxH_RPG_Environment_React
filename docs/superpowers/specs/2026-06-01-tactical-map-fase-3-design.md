# Tactical Map — Fase 3: Imagem de Fundo

**Data:** 2026-06-01
**Status:** Aprovado — pronto para implementação
**Escopo:** Cross-stack mínimo (frontend + extensão trivial no backend)
**Fase anterior:** Fase 2 — Editor de Malha
**Spec mestre:** `System_X_System/docs/superpowers/specs/2026-05-31-tactical-map-design.md`

---

## 1. Objetivo

Permitir que o mestre adicione uma imagem de fundo ao mapa, calibre seu posicionamento com a malha como guia visual, e salve. A experiência é imersiva: a imagem é ajustada para cobrir o grid sem distorção; o mapa é livre no editor e travado no viewer.

**Critério de pronto:** mestre faz upload (ou cola URL), ajusta tamanho/posição/rotação com a malha como referência, salva, recarrega — imagem aparece sob a malha com os ajustes preservados.

---

## 2. O que já existe

| Arquivo | Estado |
|---|---|
| `src/components/organisms/TacticalMapStage.tsx` | Renderiza `BgLayer` (Sprite com `x/y/width/height/rotation/opacity`); camada bg já existe |
| `src/features/tactical-map/store/editorStore.ts` | Action `setBg(bg: BgImage \| null)` já implementada |
| `src/features/tactical-map/TacticalMapEditor.tsx` | Casca funcional; integra store |
| `src/components/molecules/MapEditorToolbar.tsx` | Aba "bg" existe e está desabilitada — Fase 3 a ativa |
| `src/types/tacticalMap.ts` | `BgImage`, `GridShape`, `TacticalMap` todos definidos |
| `src/components/molecules/ImagePickerModal.tsx` | Upload+URL para avatar/cover; **não será reusado** (tem cropper incompatível) |
| `internal/app/api/upload/presigned_url.go` | Aceita `file_type: "avatar" \| "cover"`; precisa de extensão mínima |

---

## 3. Arquitetura

### Novos arquivos

```
src/
├── components/
│   └── molecules/
│       └── BgImagePanel.tsx          ← painel BG completo (picker + calibração)
├── constants/
│   └── uiStrings.ts                  ← strings compartilhadas (tip do picker)
└── hooks/
    └── usePresignedUpload.ts         ← abstrai fluxo presigned URL → PUT R2
```

### Arquivos modificados

```
src/
├── components/organisms/TacticalMapStage.tsx  ← + prop clampToGrid: boolean
├── components/organisms/MapEditorToolbar.tsx  ← ativar aba "bg" + montar BgImagePanel
├── components/molecules/ImagePickerModal.tsx  ← atualizar tip com string de uiStrings.ts
internal/
└── app/api/upload/presigned_url.go            ← + file_type "map_bg" + map_uuid
```

---

## 4. `BgImagePanel` — design detalhado

### Dois renders condicionais (sem máquina de estados)

O painel muda baseado em `map.bg === null`. A **ferramenta ativa no toolbar** é o seletor de modo — não há botão "entrar em calibração". Se a aba BG está ativa no toolbar: a imagem é interativa no canvas. Se outra aba está ativa: a imagem é travada.

**Sem imagem (`map.bg === null`):**
```
Imagem de fundo
───────────────────────────
┌──────────────────────────┐
│  Clique ou solte         │   ← dropzone (click-to-select + drag-and-drop)
│  uma imagem aqui         │
└──────────────────────────┘

── ou ──

[URL da imagem____________]  [Adicionar]

ℹ️ Adicione por arquivo ou URL.
   Uma opção descarta a outra.
```

**Com imagem (`map.bg !== null`):**
```
Imagem de fundo
───────────────────────────
[Trocar imagem]  [✕ Remover]

Pos X:  [__________] px
Pos Y:  [__________] px

Escala: [──────●──────]  80%
X [──●──]  🔒  Y [──●──]     ← lock/unlock aspect ratio

Rotação:   [──────●──────]   0°
Opacidade: [──────●──────]   80%

[Encaixar no grid]
```

### Comportamento dos controles

| Controle | Detalhe |
|---|---|
| Dropzone | `accept="image/*"` + drag-and-drop nativo; comprime via `browser-image-compression` antes do upload R2 |
| URL input | Pressiona Enter ou clica [Adicionar]; armazena URL diretamente em `bg.url` sem upload |
| Pos X / Pos Y | Inputs numéricos `type="number"` com step=1; sincronizados com drag on-canvas |
| Escala | Slider + input numérico (% com 2 casas); default: locked (X e Y movem juntos) |
| Lock aspect ratio | Ícone 🔒/🔓 entre sliders X e Y; quando unlock: mestre pode distorcer para calibrar grids diferentes |
| Rotação | Slider −180° a +180° + input numérico |
| Opacidade | Slider 0–1 (step 0.05) + valor % |
| Encaixar no grid | Re-aplica cover fit: `width = cols × cellSize`, depois `height` escala proporcionalmente |
| Trocar imagem | Volta a mostrar dropzone + URL; canvas mantém imagem atual até nova ser confirmada |
| Remover imagem | `store.setBg(null)`; aviso se mapa tinha cols/rows derivados da imagem |

### Sincronização canvas ↔ painel

Drag da imagem no canvas → `store.setBg({ ...bg, x: newX, y: newY })` → inputs atualizam.  
Qualquer input → `store.setBg(...)` → canvas atualiza.  
Tudo ao vivo, zero botão de confirmação. Salvo junto com o mapa no [Salvar] principal.

---

## 5. Comportamento do canvas por ferramenta ativa

| Ferramenta ativa | Drag na imagem | Drag em área vazia | Zoom |
|---|---|---|---|
| BG | Move imagem; atualiza Pos X/Y | Pan viewport | ✅ |
| Qualquer outra | — (imagem travada) | Pan viewport | ✅ |

Implementação: quando ferramenta BG está ativa, o `TacticalMapStage` registra `pointerdown` no Sprite da imagem → `isDraggingBg = true`; `pointerup` global → `isDraggingBg = false`. Durante drag, `pointermove` chama `store.setBg` com o delta. Pixi-viewport `drag` plugin permanece ativo mas não é disparado enquanto o drag da imagem está consumindo o evento (`event.stopPropagation()` no sprite).

---

## 6. Viewport clamping — editor vs. viewer

**Decisão arquitetural implementada na Fase 3 para uso na Fase 6:**

`TacticalMapStage` recebe prop `clampToGrid: boolean` (default `false`).

```ts
// TacticalMapStage.tsx
type TacticalMapStageProps = {
  map: TacticalMap;
  width: number;
  height: number;
  clampToGrid?: boolean;   // default false
  // ...
};
```

| Contexto | `clampToGrid` | Comportamento |
|---|---|---|
| `TacticalMapEditor` (Fase 3) | `false` | Pan/zoom livres; mestre vê sobras da imagem além do grid |
| `TacticalMapViewer` (Fase 6) | `true` | Viewport clamped ao bounding box do grid; jogadores não veem fora do mapa |

Quando `clampToGrid=true`:
```ts
viewport.clamp({
  left: 0,
  right: grid.cols * grid.cellSize,
  top: 0,
  bottom: grid.rows * grid.cellSize,
  underflow: 'center',
});
```

Fase 6 apenas passa `clampToGrid={true}` para o Viewer — sem refatorar o Stage.

---

## 7. Cover fit e recálculo do grid

Ao confirmar uma nova imagem (upload ou URL), o sistema:

1. Carrega a imagem para obter `naturalWidth` e `naturalHeight`
2. Calcula o **cover fit**:
   - `scaleToFillX = (grid.cols * grid.cellSize) / naturalWidth`
   - `scaleToFillY = (grid.rows * grid.cellSize) / naturalHeight`
   - `scale = Math.max(scaleToFillX, scaleToFillY)`  ← cobre tudo, sem distorção
   - `width = naturalWidth * scale`
   - `height = naturalHeight * scale`
   - `x = (grid.cols * grid.cellSize - width) / 2`  ← centralizado
   - `y = (grid.rows * grid.cellSize - height) / 2`
3. Se o mapa ainda não tem `cellSize` derivado de imagem: recalcula
   - `cellSize = naturalWidth / grid.cols`
   - `rows = Math.floor(naturalHeight / cellSize)`
   - `store.setGrid({ ...grid, cellSize, rows })`

**Mapa sem imagem:** `cellSize` e `rows` continuam definidos manualmente pelo mestre via `GridConfigPanel`.

---

## 8. Aviso de truncação antes de salvar

Se ao salvar `bg.x + bg.width < grid.cols * grid.cellSize` ou `bg.y + bg.height < grid.rows * grid.cellSize` (linhas/colunas inteiras descobertas):

> *"X colunas e/ou Y linhas não estão cobertas pela imagem e serão removidas ao salvar."*

O sistema remove as colunas/linhas descobertas do `grid` no payload enviado ao backend. A validação também ocorre no backend (`map_validator.go`).

---

## 9. Tip de consistência — `uiStrings.ts`

```ts
// src/constants/uiStrings.ts
export const IMAGE_PICKER_TIP =
  'Adicione por arquivo ou URL. Uma opção descarta a outra.';
```

Usado em:
- `BgImagePanel` (sidebar) — exibido abaixo do URL input
- `ImagePickerModal` (avatar/cover) — substitui a Subtitle atual

---

## 10. Fluxo de upload — presigned R2

### Frontend (`usePresignedUpload.ts`)

```ts
// 1. POST /upload/presigned-url → { upload_url, public_url }
// 2. PUT blob direto para upload_url (browser → R2, sem passar pelo backend)
// 3. Retorna public_url para armazenar em BgImage.url
```

### Backend — extensão mínima

`internal/app/api/upload/presigned_url.go`:
- Aceitar `file_type: "map_bg"` além de `"avatar"` e `"cover"`
- Request body: adicionar campo opcional `MapUUID string` (usado quando `file_type == "map_bg"`)
- Chave R2: `map_bg/<map_uuid>.webp`
- Validação: se `file_type == "map_bg"` e `map_uuid` inválido → 400

Nenhuma outra mudança no backend.

---

## 11. Erros

| Situação | Tratamento |
|---|---|
| Upload R2 falha | Toast "Não foi possível fazer upload. Tente novamente." |
| URL inválida / imagem não carrega | Erro inline no campo URL; `BgLayer` não renderiza |
| Compressão falha | Usa blob original sem compressão (fallback silencioso) |
| Imagem muito grande (>8MB pós-compressão) | Toast "Imagem muito grande. Use uma menor ou cole uma URL." |
| Save com truncação | Aviso descrito na seção 8; mestre pode ignorar ou ajustar |

---

## 12. Testes

| O que | Como |
|---|---|
| `BgImagePanel` — render sem imagem | RTL: renderiza dropzone + URL input + tip |
| `BgImagePanel` — render com imagem | RTL: renderiza sliders + Trocar + Remover |
| Fluxo de upload | RTL + msw: mock presigned-url endpoint → mock PUT R2 → verifica `setBg` chamado com `public_url` |
| Fluxo de URL | RTL: preenche URL, clica Adicionar, verifica `setBg` chamado |
| Lock/unlock aspect ratio | RTL: toggle lock, altera escala X, verifica Y muda junto (locked) ou não (unlocked) |
| Cover fit | Vitest unit: `computeCoverFit(naturalW, naturalH, grid)` → verifica `x/y/width/height` |
| Recálculo de grid | Vitest unit: `deriveGridFromImage(naturalW, naturalH, cols)` → verifica `cellSize` e `rows` |
| Drag canvas (canvas interaction) | Validação visual em `/dev/tactical-map-demo` |
| `clampToGrid` | Visual no browser: Editor — pan além do grid funciona; Viewer — não funciona |

---

## 13. Integração com o sistema existente

| Surface | Mudança |
|---|---|
| `src/components/organisms/TacticalMapStage.tsx` | + prop `clampToGrid?: boolean`; ativar `viewport.clamp()` quando true |
| `src/components/organisms/MapEditorToolbar.tsx` | Ativar aba "bg"; montar `BgImagePanel` quando aba ativa |
| `src/components/molecules/ImagePickerModal.tsx` | Substituir Subtitle por `IMAGE_PICKER_TIP` de `uiStrings.ts` |
| `src/constants/uiStrings.ts` | Novo — string compartilhada do picker |
| `src/components/molecules/BgImagePanel.tsx` | Novo |
| `src/hooks/usePresignedUpload.ts` | Novo |
| `internal/app/api/upload/presigned_url.go` | + `"map_bg"` + `map_uuid` |
| `src/App.tsx` | Nenhuma mudança |
| `src/pages/CreateMapPage.tsx` | Nenhuma mudança (editor já usa `TacticalMapEditor`) |

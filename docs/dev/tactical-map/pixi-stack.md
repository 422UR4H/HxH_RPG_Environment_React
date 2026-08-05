# PixiJS no nosso projeto

> Tudo que você precisa saber sobre a stack gráfica (PixiJS + @pixi/react + pixi-viewport) sem ter que ler documentação externa antes de começar.

## O que é PixiJS

PixiJS é uma biblioteca **2D** para desenhar coisas com **WebGL** (usando sua GPU) e, se WebGL não funcionar, com **Canvas2D** automaticamente. É a lib mais usada pra renderizar coisas 2D performáticas no navegador. O **FoundryVTT** (a plataforma de VTT mais popular do mundo) é feito em cima dela — então a escolha tem comprovação massiva.

**Em uma frase**: PixiJS desenha milhares de sprites em mobile sem engasgar. É como um motor de jogo 2D dentro do navegador.

## Conceitos centrais — vocabulário Pixi

Você não precisa decorar — ter o modelo mental basta.

### Application

A "raiz" do PixiJS. Quando você cria um `Application`, ele monta um `<canvas>` e fica desenhando 60x por segundo. No nosso projeto, a `Application` é gerenciada pelo `@pixi/react` — você não a cria diretamente, só configura via props.

### Stage / Container

O **`Stage`** é o container raiz que vai dentro da `Application`. Tudo que aparece na tela é descendente do Stage.

Um **`Container`** é como uma `<div>` em HTML — agrupa elementos. Ele tem posição, rotação, escala, e seus filhos herdam a transformação. **Você organiza a cena em camadas usando containers.**

Exemplo do nosso `TacticalMapStage`:

```
Stage
└─ Viewport             ← faz pan/pinch-zoom
   └─ worldContainer
      ├─ bgContainer       ← imagem de fundo
      ├─ gridContainer     ← linhas da malha
      ├─ piecesContainer   ← peças (avatares)
      └─ overlayContainer  ← seleção, hover
```

### Sprite

Uma imagem desenhada na tela. Tem posição, rotação, escala, opacidade. Quando você quer mostrar uma peça (gungi-frame + avatar) ou uma decoração (PNG de árvore), é uma `Sprite`.

> Você já viu sprites na Unity em C# — é exatamente o mesmo conceito.

### Graphics

Para desenhar formas geométricas (linhas, polígonos, retângulos, círculos). A malha do mapa é um único `Graphics` que desenha todas as linhas — desenhar 3600 linhas como objetos separados seria lento. Como um `Graphics`, vira uma textura otimizada que a GPU mostra de graça.

### Texture

A imagem em memória da GPU. Quando você cria uma `Sprite`, ela referencia uma `Texture`. Múltiplas sprites podem compartilhar a mesma texture — útil pra peças (todas usam o mesmo gungi-frame, só varia o avatar).

### Ticker

O loop de renderização do Pixi (~60fps). Geralmente você não toca; o @pixi/react já cuida.

## @pixi/react — Pixi escrito como React

PixiJS puro é imperativo: você cria objetos com `new`, adiciona com `addChild`, remove com `removeChild`. **Verboso e propenso a memory leaks**.

O **@pixi/react** traz JSX para isso. Você escreve:

```tsx
<Application>
  <pixiContainer x={100} y={50}>
    <pixiSprite texture={tex} x={10} y={10} />
    <pixiGraphics draw={(g) => {
      g.clear();
      g.lineStyle(2, 0xffffff);
      g.moveTo(0, 0);
      g.lineTo(100, 100);
    }}/>
  </pixiContainer>
</Application>
```

E o @pixi/react faz por baixo: criar, adicionar, atualizar, remover sprites no momento certo, conforme o JSX muda. Você ganha:

- Declarativo (igual o resto do React)
- Cleanup automático (sem leaks)
- Mistura com hooks (`useState`, `useEffect`, props)

> **Versão importante**: `@pixi/react v8` casa com `pixi.js v8`. Não misture versões antigas (v7 com v8).

## pixi-viewport — pan/zoom prontos

Pinch-zoom em mobile e pan com drag são complicados de implementar bem (gestos, inércia, limites de zoom). O **`pixi-viewport`** resolve. Você embrulha seu mundo num `Viewport` e ganha:

```tsx
<Application>
  <Viewport
    screenWidth={800}
    screenHeight={600}
    worldWidth={2000}
    worldHeight={2000}
    events={app.renderer.events}
    plugins={['drag', 'pinch', 'wheel', 'decelerate']}
  >
    {/* seu mundo aqui */}
  </Viewport>
</Application>
```

E pronto:
- **drag**: arrastar a câmera com o dedo / mouse
- **pinch**: zoom com 2 dedos no mobile
- **wheel**: zoom com a rodinha do mouse
- **decelerate**: inércia ao soltar

Configura limites: zoom mínimo/máximo, área de pan, snap-back. Tudo via props.

## Como nossa cena é estruturada

O `TacticalMapStage` (o "núcleo") recebe um `map: TacticalMap` por prop e desenha:

```tsx
<Application>
  <Viewport {...viewportConfig}>
    <pixiContainer name="world">
      {map.bg && <BgSprite bg={map.bg} />}
      <GridGraphics grid={map.grid} />
      {/* futuro: <DecorationsLayer decorations={map.decorations}/> */}
      {map.pieces.map(p => <PieceSprite key={p.id} piece={p} grid={map.grid}/>)}
      {/* futuro: <WallsLayer walls={map.walls}/> */}
      <OverlayLayer />
    </pixiContainer>
  </Viewport>
</Application>
```

A árvore React = a árvore Pixi. Quando o map prop muda, o Pixi se ajusta sozinho.

## Hit-test — como saber em que peça/slot o usuário clicou

PixiJS tem detecção de clique nativa por sprite. Cada `Sprite` ou `Container` pode ter `eventMode='static'` e responder a eventos como `pointerdown`, `pointerup`, `pointermove`.

```tsx
<pixiSprite
  texture={tex}
  x={x} y={y}
  eventMode="static"
  onpointerdown={(e) => console.log('cliquei na peça', piece.id)}
/>
```

Tap em **slot vazio** (sem peça): nenhuma sprite intercepta; o evento "sobe" pro container que envolve a grade. Capturamos lá e calculamos qual slot foi pelo `worldToSlot(eventPos, grid)`.

## Performance — o que você precisa saber

Resumo das otimizações chave (já documentadas no spec, mas vale recapitular):

| Coisa | Por quê | Como |
|---|---|---|
| Grade num único `Graphics` | 3600 sprites separadas matariam o FPS | `<pixiGraphics draw={g => { ...desenha tudo... }}/>` |
| Memoizar refs Pixi | Re-criar sprite a cada render = leak + jank | `useMemo` em coisas pesadas |
| Drag sem re-render React | Update do React em cada frame de drag = jank | Mover sprite local; commit no `pointerup` |
| Lazy load do bundle | Pixi é ~250KB; quem não abre o mapa não baixa | `React.lazy(() => import('./CreateMapPage'))` |
| Texturas compartilhadas | Toda peça usa o mesmo gungi-frame | Cachear `Texture` por URL |

## Limites e gotchas

- **WebGL não funciona em alguns navegadores muito velhos** (~1% do mercado). Pixi tenta Canvas2D automaticamente; se falhar, mostramos mensagem de erro com link.
- **jsdom não renderiza WebGL**. Vitest não pode testar Pixi de verdade. Veja [testing.md](./testing.md) pra estratégia.
- **Pixi não responde a CSS**. Tudo é em pixels do mundo, controlado por props. Não tente estilizar com styled-components.
- **`<canvas>` ocupa espaço fixo**. O tamanho da Application é controlado por props; redimensionar requer recalcular.

## Fog de guerra: composição sem blending

O fog do jogador tem **um nível só** e **não** usa blend mode. Duas tentativas erradas,
para não repetir:

- `blendMode="erase"` na camada de fog perfura o framebuffer principal até a cor de
  limpeza do canvas. A área "iluminada" sai preta sólida em vez de revelar o mapa.
- `isRenderGroup` **não** resolve: ele não cria render target isolado.

O que funciona é stencil, em dois usos do mesmo polígono de visibilidade:

1. **Fog** — um retângulo único (tabuleiro + padding) com máscara **invertida**:
   `container.setMask({ mask, inverse: true })`. Some exatamente dentro da LOS.
2. **Paredes** — desenhadas *acima* do fog, em dois passes (`LosSplit`): máscara normal
   em alpha cheio (o que o personagem vê agora) e máscara invertida em alpha 0.5 (o que
   ele lembra). Per-pixel, então uma parede metade em visão sai corretamente dividida.

A máscara das paredes é **dilatada**; a do fog **não**. Uma parede que bloqueia a visão
fica exatamente *sobre* a aresta do polígono, então um recorte exato a corta ao meio no
sentido do comprimento: a metade do lado do observador nítida, a outra esmaecida como se
fosse memória. `drawLosMask(g, polys, dilate)` engorda a região coberta traçando o mesmo
caminho com `width = 2*dilate` — o `StencilMaskPipe` coleta os renderables da máscara com
o color mask desligado, então um stroke escreve no stencil igual a um fill. Os dois passes
usam a mesma máscara dilatada, então continuam complementares exatos e nada é desenhado
duas vezes. Dilatar a máscara do fog seria um vazamento: limparia uma fatia de chão logo
atrás da parede.

Não existe classificação por célula em lugar nenhum. A memória do personagem é de
**estrutura estática**, resolvida no backend por id de parede — o cliente desenha o que
recebeu e deixa o stencil decidir o brilho.

Quatro armadilhas do Pixi v8 nesse caminho:

- Os filhos de `LosSplit` são montados **duas vezes**, então precisam ser puramente
  apresentacionais. Um componente que registra listener de DOM em efeito registraria
  duas vezes — em `WallsLayer` isso significa cada clique de porta disparando em dobro,
  sem nada no console.
- Cada container mascarado precisa da **sua própria** `Graphics`: um mesmo display
  object não pode ser máscara de dois containers.
- A máscara **não pode** receber `visible={false}` — o `StencilMaskPipe` deixaria de
  coletar a geometria. Máscara invertida vazia escurece tudo; máscara normal vazia
  esconde tudo. Nenhum dos dois emite erro.
- `inverse` só se liga por `setMask({ mask, inverse: true })`. `_maskOptions` é objeto
  compartilhado no protótipo do mixin; mutá-lo direto vaza para outros containers.

`Graphics.cut()` foi avaliado e descartado: earcut não define comportamento para furos
sobrepostos (jogador com duas peças), e `cut()` anexa o segundo furo em diante também à
instrução de fill anterior.

## Onde aprender mais

- Site oficial: [pixijs.com](https://pixijs.com)
- Docs API: [pixijs.download/release/docs/](https://pixijs.download/release/docs/)
- @pixi/react: [pixijs.io/pixi-react](https://pixijs.io/pixi-react/)
- pixi-viewport: [github.com/davidfig/pixi-viewport](https://github.com/davidfig/pixi-viewport)
- FoundryVTT (estudar como é em produção): [foundryvtt.com](https://foundryvtt.com) — projeto open-source

Quando bater dúvida, comece pelos docs oficiais — eles têm playgrounds. Aqui você tem o "porquê" e o "como integramos"; eles têm o "como cada função funciona".

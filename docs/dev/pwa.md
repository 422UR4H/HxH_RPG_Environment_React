# App instalável (PWA) e tela cheia na mesa

No celular e no tablet, a barra de endereço e as abas do navegador comem a tela da mesa
(`/campaigns/:campaignId/matches/:matchId/game`). Há dois caminhos para escondê-las, e os
dois existem de propósito:

| Caminho | Quem usa | O que esconde |
|---|---|---|
| **App instalado** (manifesto) | quem instalou pelo navegador | barra de endereço, abas e barra de status, em todas as telas |
| **Botão "Tela cheia"** (Fullscreen API) | quem abriu a mesa no navegador comum | o mesmo, só enquanto estiver na mesa |

## Manifesto

- `public/manifest.webmanifest`, ligado no `index.html` (`<link rel="manifest">`).
- `display: "fullscreen"`: o app abre sem nada do navegador e sem a barra de status do
  Android. Onde o sistema não oferece `fullscreen` (iPhone/iPad), ele cai sozinho para
  `standalone` (sem barra de endereço, com a barra de status).
- Ícones: `icon-192.png`, `icon-512.png` (fundo transparente) e `icon-maskable-512.png`
  (fundo preto, logo dentro da zona segura de 80 %, porque o Android recorta em círculo ou
  em gota). Todos gerados com `magick` a partir de `public/favicon.svg`:

  ```bash
  magick -background none -density 600 public/favicon.svg -resize 184x184 -gravity center -extent 192x192 -depth 8 -strip PNG32:public/icon-192.png
  magick -background none -density 600 public/favicon.svg -resize 492x492 -gravity center -extent 512x512 -depth 8 -strip PNG32:public/icon-512.png
  magick -background none -density 600 public/favicon.svg -resize 330x330 -background black -gravity center -extent 512x512 -flatten -depth 8 -strip PNG32:public/icon-maskable-512.png
  ```

- `theme_color` é o marrom da barra da mesa (`brown900`); `background_color` é o preto
  do ícone (fundo da tela de abertura). Valores em hex porque o manifesto não lê os tokens:
  se o token mudar, mude aqui e no `<meta name="theme-color">` do `index.html`.
- **Sem service worker, de propósito.** O Chrome não exige mais service worker para instalar.
  A mesa só funciona online (WebSocket), e um cache de service worker serviria o bundle
  velho depois de cada deploy. Se um dia houver um, ele precisa de estratégia de atualização.
- `viewport-fit=cover` no `<meta name="viewport">`: em tela cheia, o conteúdo ocupa a tela
  inteira, inclusive atrás do recorte da câmera. Decisão do dono do produto: preferir a tela
  toda a uma faixa preta. Se algum controle ficar escondido atrás da câmera, a correção é
  `padding` com `env(safe-area-inset-*)` só no elemento afetado.

### Instalar

- **Android (Chrome):** menu ⋮ → "Instalar app" (ou o aviso que aparece sozinho).
- **iPhone/iPad (Safari):** Compartilhar → "Adicionar à Tela de Início".
- **Desktop (Chrome/Edge):** ícone de instalar na barra de endereço.

Exige **HTTPS** (ou `localhost`). Pela rede local (`http://192.168…`, ver o teste no tablet)
a opção de instalar não aparece; o botão de tela cheia funciona.

No iPhone o app instalado tem armazenamento próprio: o jogador loga de novo uma vez. No
Android ele compartilha o `localStorage` com o Chrome.

## Botão "Tela cheia" na mesa

- `useFullscreen` (`src/hooks/useFullscreen.ts`) e o botão no fim da `MatchTopBar`, que mestre e
  jogador usam.
- O navegador só entra em tela cheia com um toque do usuário: não dá para ligar sozinho ao abrir
  a mesa.
- O botão some onde a API não existe (Safari do iPhone, que só põe vídeo em tela cheia) e no app
  instalado em tela cheia, onde ele não teria efeito.
- Ao sair da `/game` (partida encerrada, por exemplo), a página sai da tela cheia: as outras
  telas não têm o botão para voltar.
- O gesto de voltar do Android e o Esc do teclado saem da tela cheia. Sair do app pelo botão de
  início do sistema sempre funciona.

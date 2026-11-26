# Efeitos de status no front — design (Product Design)

> Documento final da sessão de Product Design (2026-11-19 a 2026-11-25), pedido pelo brief do PO
> `System_X_System/docs/superpowers/specs/2026-11-19-status-effects-front-brief.md`. Decidido com o
> dono do produto e o líder de product design, direto no navegador, sem Claude Design.
>
> **Como ler:** este arquivo é o índice — uma linha por decisão e onde ver cada tela. As regras de
> desenho que não podem voltar, os textos aprovados, as lacunas e as perguntas estão por extenso em
> **`2026-11-22-status-effects-front-prompt-po.md`** (é o que a sessão de PO repassa a quem
> implementa). O histórico rodada a rodada, com quem decidiu cada coisa, está em
> `2026-11-21-status-effects-front-design-notes.md`.

## Telas finais

Na pasta `2026-11-21-status-effects-front-mockups/` (abrem com duplo clique). O que não está listado
aqui é histórico de versões.

| Lugar | Mockup final |
|---|---|
| Peça do mapa | `peca-pilha.html`, `peca-faixa-e-caixa.html` |
| Painel de ação do jogador | `painel-acao-jogador.html` |
| Mestre: aplicar, editar e tirar status | `mestre-v7.html` (menos a etapa "Aba Status", substituída pela lista de personagens) |
| Lista de personagens | `personagens-v3.html` |
| Destaque no jogador | `destaque-v5.html` |
| Mestre: painel fixo, aba "Partida", ficha, layout por tamanho de tela | `partida-v6.html` |

## Decisões (uma por linha)

**Peça do mapa**
- Pilha acima da peça: faixa de status → barras de vida e stamina (se visíveis) → balão da ação.
- Faixa: ícones coloridos pela família, número em selo; clicar abre a caixa no lugar, crescendo do centro.
- Mestre: o que a mesa não vê fica apagado; a caixa da peça é a porta para editar (lápis) e aplicar.

**Painel de ação** (o formato novo é só do jogador; o miolo vale para todos)
- Mostra o alvo e as opções de ação; sem alvo, o círculo é o próprio actor.
- Jogador: folha arredondada vindo de trás da navegação; peça no círculo, barras da ficha ao lado.
- Enviar fica na navegação: botão redondo encaixado num recorte em "U", em verde.
- "Agindo como" só para quem pode agir com mais de um personagem.
- Bloqueio: aviso curto e direto; bloqueio total não abre o painel (ver Destaque).

**Mestre aplicando, editando e tirando**
- Celular: folha só com os campos do status escolhido; computador: janela com a lista à esquerda e os campos à direita.
- Intensidade com − / ＋, começando "não definida"; "Afeta" em quatro botões iguais.
- Uma lista de personagens dentro de "Aplicar em": coluna "Recebe" sempre, coluna "Vê" só em "Escolher".
- "Quem vê": Todos · Mestre e alvo · Só o mestre · Escolher; o padrão do tipo marcado.
- Sem "Ligado a": o status vale no instante em que o mestre aplica.
- "Confira" antes de aplicar em vários; "Tirar e devolver as ações" / "Tirar sem devolver as ações".

**Lista de personagens**
- O card de hoje fica igual; a faixa de status vem presa embaixo dele.
- Aplicar só pelo "＋ status" de cada card; o footer do mestre tem "Personagens" (não há aba "Status").

**Destaque no jogador**
- Avisos na pilha que a mesa já tem no topo do mapa, com a etiqueta do status, X e tempo para sumir.
- Luz na borda do mapa ao ganhar status, uma piscada forte que some devagar; vermelho para dano.
- Fora de ação: cadeado vermelho no "Ação"; tocar mostra o motivo.

**Cores**
- Famílias com cor própria, todas já na palette; Guarda em `gold400` (verde fica para status bons).
- Debilitados na cor da aptidão em todo o site: corpo vermelho, mente roxo, espírito azul-claro.

**Mestre: painel fixo, "Partida" e layout**
- Header sem mudança em todo tamanho de tela.
- Celular: mapa e painel do mestre meio a meio, fixo, sem X; footer Fila · Ficha · Agir · Personagens · Partida.
- Ficha no celular (mestre e jogador): folha sobre o mapa, fecha no X, tocando fora ou em "Ficha".
- "Partida": Nova cena, revelar barras, configurações da mesa, Encerrar partida; Regime continua na Fila.
- Computador padrão e tablet (mestre): coluna em duas metades — interface em cima, fila embaixo.
- Widescreen (mestre): fila e a seção de Agir/Ficha/Partida em duas colunas fixas.
- Fila num tom mais escuro onde divide a tela com outras seções (no celular, como está).
- Fila sempre à esquerda do tablet para cima; celular deitado com fila e navegação à esquerda.

## Lacunas de contrato e perguntas de regra

Listadas por extenso no prompt ao PO (seções "Lacunas de contrato" e "Perguntas de regra de jogo"):
L1 barras ao vivo e revelar · L2 texto da recusa por status invisível · L3 "já tem" em lote ·
L4 revelar no histórico · L5 "quem vê" por personagem num lote · L6 "Amarrado" · L7 intensidade
opcional · L8 causa da ação tirada da fila. Perguntas: números dos status dos outros, vários alvos,
intensidade "não definida", histórico sem âncora de ação, e a conversa do dono sobre o Congelando.

## Fora do escopo agora

- A ficha no computador (abre como hoje; o dono refina com o líder de PD).
- O formato da tela do mestre além do descrito (o dono revê com o designer humano).

# Briefing Claude Design — regras da ficha (2026-11-11)

Para quem serve: o dono do produto leva o **prompt** abaixo ao Claude Design (artifact tipo Design,
design system "System X System") junto com os 3 prints da pasta homônima, e traz o link do protótipo
para uma sessão do Claude Code implementar.

**Anexar na conversa do Claude Design** (ele não lê arquivos do computador):
1. `2026-11-11-briefing-regras-da-ficha/1-criar-ficha-desktop-1440.png`
2. `2026-11-11-briefing-regras-da-ficha/2-criar-ficha-celular-390.png`
3. `2026-11-11-briefing-regras-da-ficha/3-detalhe-coluna-atributos.png`

Prints tirados em 2026-11-11 da tela `/charactersheet/new` com a classe Swordsman escolhida.

---

## Prompt (copiar a partir daqui)

Use o design system **System X System**. Leia o README dele antes de começar, sobretudo
"Padrões do site", e use os assets reais dele: o fundo `assets/Backgrounds/space.png` e os ícones
`questionmark-sm.svg` / `questionmark.svg`. Anexei 3 prints da tela atual de criação de ficha.

### O problema

Quem testa o site (um RPG de mesa digital de Hunter x Hunter) não entende como criar a ficha de
personagem: o site não explica as regras em lugar nenhum. A pessoa vê um losango com siglas em
inglês (RES, AGI, Str, Cel…), três números sob cada sigla, "Pontos para Distribuir: 3", botões de
+ e −, e não sabe o que nada disso significa nem por que deveria pôr pontos aqui ou ali.

### O que desenhar

1. **O botão de ajuda na ficha.** Um "?" (ícone `questionmark-sm.svg`) no **canto superior direito
   da coluna ATRIBUTOS** (a coluna dos diagramas físico e mental; veja o print 3). Precisa funcionar
   no desktop (coluna à esquerda, painel PERÍCIAS à direita) e no celular (a coluna ocupa a largura
   toda). Não redesenhe a ficha: só encaixe o "?" nela, sem empurrar o título ATRIBUTOS nem os
   diagramas.
2. **A superfície de regras** que o "?" abre: explica atributos, perícias e o que mais for preciso
   para criar um personagem sem dúvidas (detalhes em "Conteúdo"). Ela usa o **mesmo fundo da ficha**
   (`space.png`, a imagem real, nunca uma cor chapada) com o texto em painéis escuros legíveis,
   como o painel PERÍCIAS dos prints.

### Como a pessoa usa

Ela está no meio da criação: escolheu a classe, tem 3 pontos para distribuir e não sabe onde pôr.
Abre as regras, lê sobre atributos, volta, põe um ponto, volta às regras para ver o que uma perícia
faz, e assim por diante. Ir e voltar tem de ser **imediato e sem perda**:

- Nada do que ela já preencheu na ficha pode se perder ao abrir ou fechar as regras.
- Ao voltar, ela está exatamente onde estava na ficha (mesma rolagem).
- O "?" da coluna de atributos abre as regras **já na seção de atributos**, não no topo.
- Dentro das regras, um sumário permite pular entre seções; a seção atual fica marcada.

Desenhe **duas variantes de navegação** para compararmos lado a lado:

- **A — página própria:** as regras ocupam a tela inteira, com a seta Voltar do site no canto
  superior esquerdo (o mesmo "VOLTAR" dos prints) levando de volta à ficha.
- **B — painel sobre a ficha:** no desktop, um painel lateral que se abre por cima da ficha,
  deixando ver os diagramas enquanto se lê; no celular, o mesmo painel ocupa a tela toda, com um
  botão de fechar claro. A ficha continua montada por baixo.

Em cada variante, diga em uma frase o ponto forte e o ponto fraco dela.

### Conteúdo

O texto final virá dos documentos de regras do jogo (Markdown), e a página vai renderizá-los. Por
isso:

- **Desenhe os estilos dos elementos de Markdown**, não um layout feito à mão para cada parágrafo:
  título de seção (h2), subtítulo (h3), parágrafo, lista, **tabela**, citação usada como **caixa de
  fórmula** (ex.: "valor de teste = nível da perícia + poder do atributo") e uma caixa de nota/
  curiosidade. Quando um documento mudar, a página muda sozinha, então nada pode depender do texto
  exato.
- **Até duas ilustrações próprias** (componentes, fora do Markdown) valem a pena, porque explicam o
  que o texto não explica bem:
  1. Um nó de atributo anotado: `3 0 7` sob "AGI" = **nível · pontos (verde) · poder**.
  2. O losango físico explicando primários e médios: os 4 vértices (RES, AGI, FLX, SEN) recebem
     pontos; os 4 do meio das arestas (Str, Cel, Dex, Con) são a média dos dois vértices vizinhos.
  Use a mesma aparência dos diagramas dos prints.
- A ficha mostra nomes em **inglês e abreviados**; as regras estão em **português**. Sempre que a
  página citar um atributo ou perícia, mostre os dois (ex.: "Agilidade · AGI"). Inclua uma seção
  de glossário com as siglas.

Texto de exemplo, fiel às regras atuais (use-o no protótipo):

**Criando seu personagem (resumo, no topo):** 1) preencha o perfil (apelido, nome, aniversário…);
2) escolha a classe; 3) distribua os pontos de atributos físicos e mentais até zerar "Pontos para
Distribuir"; 4) se a classe oferecer, escolha as perícias e armas que recebem experiência extra;
5) Criar Ficha.

**Classes:** a classe é a especialização inicial do personagem. Ela dá experiência inicial em certas
perícias, armas (proficiências) e atributos, e algumas oferecem lotes de experiência para você
escolher onde aplicar (ex.: 80, 40 e 40 pontos em três perícias de uma lista da classe). Não
explique cada classe separadamente; são 12 hoje (Espadachim, Samurai, Ninja, Ladino, Netrunner,
Pirata, Mercenário, Terrorista, Monge, Militar, Hunter, Mestre de Armas).

**Habilidades:** quatro grandes áreas: Físicos, Mentais, Espirituais (Nen) e Perícias. O centro de
cada losango mostra a habilidade: nível e bônus (ex.: PHYSICAL `3 4.5` = nível 3, bônus 4,5). O
bônus = (pontos de personagem + nível da habilidade) ÷ 2, e entra no poder de todos os atributos
daquela área.

**Atributos físicos:** quatro **primários**, nos vértices do losango, recebem os seus pontos:
Resistência (RES), Agilidade (AGI), Flexibilidade (FLX), Sentido (SEN). Quatro **médios**, no meio
das arestas, são a média arredondada dos vizinhos e não recebem pontos: Força (Str) = RES + AGI,
Celeridade (Cel) = AGI + FLX, Destreza (Dex) = FLX + SEN, Constituição (Con) = SEN + RES. Por isso,
pôr um ponto em AGI também fortalece Força e Celeridade.

**Atributos mentais:** quatro primários, todos recebem pontos: Resiliência (RSL), Adaptabilidade
(ADP), Julgamento (JUD), Criatividade (CRE).

**Distribuição:** os pontos de cada losango são iguais ao nível da habilidade (Físicos ou Mentais) e
precisam ser todos usados para criar a ficha. + põe um ponto, − tira.

**Lendo um atributo:** `nível · pontos · poder`. Valor = pontos + nível. Poder = valor + bônus da
habilidade (+ efeitos temporários). O poder é o número que importa nos testes.

**Atributos espirituais (Nen):** Chama e Consciência. Só existem se o personagem despertou o Nen e
não recebem pontos.

**Perícias:** ações concretas, cada uma ligada a um atributo (ex.: Defesa, Energia e Vitalidade são
de Resistência). Cada card mostra o valor de teste e o nível (`4  Lv 0`). Valor de teste = nível
da perícia + poder do atributo.

**Proficiências:** o domínio de armas (ex.: Sword Master), com nível próprio.

**Experiência em cascata:** treinar uma perícia também sobe o atributo dela, a habilidade e a
experiência do personagem. Ex.: treinar Acrobacia fortalece Flexibilidade, os Físicos e o
personagem.

**Vida e estamina (barras do topo):** HP = 20 + (nível de Vitalidade + valor de Resistência) ×
bônus dos Físicos; SP = 10 × (nível de Energia + valor de Resistência) × bônus dos Físicos.

### Boas práticas que valem aqui

- Hierarquia escaneável: o resumo de criação primeiro; fórmulas e detalhes depois, para quem
  quiser.
- Linha de texto confortável (≈ 60–75 caracteres) mesmo no desktop largo; o painel não estica o
  texto até a borda.
- Contraste mínimo 4,5:1 do texto sobre os painéis, e os painéis precisam ler bem sobre qualquer
  ponto do `space.png`.
- Alvo de toque do "?" e do fechar/voltar com pelo menos 44 × 44 px; foco visível por teclado (anel
  `actionHighlight`); o "?" tem rótulo acessível ("Regras de atributos e perícias").
- Tabelas largas não podem gerar rolagem horizontal da página no celular.
- Siga os padrões do design system (cores por token, Roboto, ícones do designer). Nada de emoji
  como ícone (os documentos têm alguns; troque por ícones do sistema ou nada).

### Entregáveis

Para cada variante (A e B), em **desktop 1440 px** e **celular 390 px**:
1. A ficha de criação com o "?" no lugar (pode partir dos prints).
2. As regras abertas na seção de atributos, com o sumário visível ou acessível.
3. Uma tela rolada mostrando os estilos de tabela, fórmula e nota.

---

## Para a sessão de implementação (não vai ao Claude Design)

**Docs de regras já alinhadas ao código** (branch `feat/sheet-rules` do back, commit
`56a1ff5`): `atributos.md` (primários e médios do losango; físicos e mentais recebem
pontos), `pericias.md` (nomes do glossário, 32 perícias), `abilities-attributes.md` §7 e o
`attributePoints` do contrato `docs/dev/api/character-sheet.md`.

- As docs têm blocos "🔧 Para Desenvolvedores" e emoji que não devem aparecer para o jogador.

**Mecanismo de "doc atualiza o front":** os repos são separados. O caminho natural é o back
embutir `docs/game/**` (`go:embed`) e servir o Markdown por um endpoint de regras, com contrato
em `docs/dev/api/`. Decidir no brainstorm da implementação.

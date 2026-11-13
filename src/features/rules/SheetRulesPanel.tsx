import { flushSync } from "react-dom";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useSheetRules } from "../../hooks/useSheetRules";
import useMediaQuery from "../../hooks/useMediaQuery";
import { breakpoints } from "../../styles/breakpoints";
import ComingSoonBadge from "../../components/ions/ComingSoonBadge";
import { PrimaryButton, Spinner } from "../../components/templates/PageState.styles";
import RulesMarkdown from "./RulesMarkdown";
import { headingId } from "./markdownMapping";
import { useActiveChapter } from "./useActiveChapter";
import { chipRowBreaks } from "./chipRows";
import { chapterMountOrder, scheduleNextChapter } from "./progressiveChapters";
import {
  Body,
  ChapterSection,
  ChapterTitle,
  Chip,
  ChipBreak,
  Chips,
  CloseX,
  ErrorBox,
  Header,
  Loading,
  Panel,
  Reading,
  Title,
  TitleIcon,
  TitleSub,
  TitleText,
  XIcon,
} from "./SheetRulesPanel.styles";

/** Largura do painel encaixado (≥ railUp); a ficha encolhe por ela. */
export const RULES_PANEL_WIDTH = "clamp(400px, 35vw, 520px)";

/** Id do painel, para o "?" que o abre apontar para ele (`aria-controls`). */
export const RULES_PANEL_ID = "sheet-rules-panel";

export interface SheetRulesPanelProps {
  startSlug: string;
  onClose(): void;
  onChapterChange(slug: string): void;
}

const TITLE_ID = "sheet-rules-title";
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
const DOCKED_QUERY = `(min-width: ${breakpoints.railUp}px)`;

const byId = (root: HTMLElement | null, id: string) => root?.querySelector<HTMLElement>(`[id="${id}"]`) ?? null;

/** Outro modal aberto, ou o Esc nasceu dentro de outro diálogo (que não é o painel). */
function otherDialogHasEsc(panel: HTMLElement | null, target: EventTarget | null): boolean {
  const isOther = (el: Element | null) => !!el && el !== panel && !panel?.contains(el);
  if (Array.from(document.querySelectorAll('[aria-modal="true"]')).some(isOther)) return true;
  return target instanceof Element && isOther(target.closest('[role="dialog"]'));
}

export default function SheetRulesPanel({ startSlug, onClose, onChapterChange }: SheetRulesPanelProps) {
  const docked = useMediaQuery(DOCKED_QUERY);
  const { data, isLoading, isError, refetch } = useSheetRules();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Estado, não ref: o observer do capítulo ativo precisa reagir quando a área de leitura monta.
  const [reading, setReading] = useState<HTMLDivElement | null>(null);

  // Callbacks do pai costumam chegar inline: a ref evita reinstalar listeners a cada render.
  const onCloseRef = useRef(onClose);
  const onChapterChangeRef = useRef(onChapterChange);
  useEffect(() => {
    onCloseRef.current = onClose;
    onChapterChangeRef.current = onChapterChange;
  });

  const slugs = useMemo(() => data?.map((c) => c.slug) ?? [], [data]);

  // Montagem progressiva: um capítulo por tarefa, a partir do pedido (ver progressiveChapters).
  // O capítulo de abertura é o da montagem: se a URL mudar com o painel aberto, a ordem não muda.
  const [openingSlug] = useState(startSlug);
  const order = useMemo(() => chapterMountOrder(slugs.length, slugs.indexOf(openingSlug)), [slugs, openingSlug]);
  // Começa em zero: o primeiro quadro depois do clique já mostra o painel (cabeçalho e chips),
  // e o capítulo pedido entra na tarefa seguinte, mesmo com as regras já no cache.
  const [mountedCount, setMountedCount] = useState(0);
  const mountedCountRef = useRef(0);
  const mounted = useMemo(() => new Set(order.slice(0, mountedCount)), [order, mountedCount]);
  const mountedSlugs = useMemo(() => slugs.filter((_, i) => mounted.has(i)), [slugs, mounted]);
  const anchorSlug = slugs[order[0]];

  // Monta até `count` capítulos de uma vez, sem a leitura pular: capítulo que entra acima empurra
  // o texto para baixo, então a rolagem anda o mesmo tanto. Medir antes e depois na mesma tarefa
  // (flushSync) evita que uma rolagem do jogador caia no meio; se o navegador já ancorou a
  // rolagem sozinho, a diferença medida é zero.
  const mountUpTo = useCallback(
    (count: number) => {
      if (!reading || count <= mountedCountRef.current) return;
      const anchor = anchorSlug ? byId(reading, anchorSlug) : null;
      const before = anchor?.getBoundingClientRect().top ?? 0;
      mountedCountRef.current = count;
      flushSync(() => setMountedCount(count));
      // Arredonda a soma: o navegador trunca a rolagem fracionária, e o erro somaria a cada capítulo.
      if (anchor) reading.scrollTop = Math.round(reading.scrollTop + anchor.getBoundingClientRect().top - before);
    },
    [reading, anchorSlug],
  );

  useEffect(() => {
    if (!data || !reading || mountedCount >= slugs.length) return;
    return scheduleNextChapter(() => mountUpTo(mountedCount + 1));
  }, [data, reading, mountedCount, slugs.length, mountUpTo]);

  const observed = useActiveChapter(mountedSlugs, reading);
  const active = observed ?? startSlug;
  // Encaixado, os chips se distribuem em até 3 fileiras cheias (sem fileira solta no fim).
  const breaks = useMemo(() => (docked ? chipRowBreaks(slugs.length) : new Set<number>()), [docked, slugs.length]);

  useEffect(() => {
    if (observed) onChapterChangeRef.current(observed);
  }, [observed]);

  // Celular: a fileira de chips rola sozinha até o chip ativo (só na horizontal).
  const chipsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const strip = chipsRef.current;
    if (docked || !strip) return;
    const chip = strip.querySelector<HTMLElement>("[aria-current]");
    if (chip) strip.scrollLeft = chip.offsetLeft - (strip.clientWidth - chip.offsetWidth) / 2;
  }, [active, docked, data]);

  // Encaixado, o painel convive com os modais da ficha (imagem, background, avisos): o Esc é
  // deles enquanto estiverem abertos. Como diálogo, o painel é o modal e o Esc é dele.
  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (docked && otherDialogHasEsc(panelRef.current, e.target)) return;
      onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [docked]);

  // Diálogo: a página por baixo não rola e o foco entra no painel.
  useEffect(() => {
    if (docked) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [docked]);

  // Abre no capítulo pedido uma vez só, quando os capítulos chegam.
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || !data || !reading || mountedCount === 0) return;
    startedRef.current = true;
    byId(reading, startSlug)?.scrollIntoView({ block: "start" });
  }, [data, reading, startSlug, mountedCount]);

  const onNavigate = useCallback(
    (slug: string, anchor?: string) => {
      // Link ou chip para um capítulo que ainda não montou: monta todos antes de rolar.
      if (!byId(reading, slug)) mountUpTo(slugs.length);
      const target = (anchor ? byId(reading, headingId(slug, anchor)) : null) ?? byId(reading, slug);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    [reading, mountUpTo, slugs.length],
  );

  const onChipClick = (slug: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    onNavigate(slug);
  };

  // Tab circula dentro do diálogo.
  const trapFocus = (e: KeyboardEvent<HTMLElement>) => {
    if (docked || e.key !== "Tab" || !panelRef.current) return;
    const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (e.shiftKey && (current === first || !panelRef.current.contains(current))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Mesmo elemento nos dois modos, só os atributos mudam: trocar a tag ao cruzar 1024 px (iPad
  // girando) remontaria o painel, perdendo a posição de leitura e reacendendo os diagramas.
  return (
    <Panel
      ref={panelRef}
      id={RULES_PANEL_ID}
      role={docked ? "complementary" : "dialog"}
      aria-modal={docked ? undefined : true}
      aria-labelledby={TITLE_ID}
      $docked={docked}
      $width={RULES_PANEL_WIDTH}
      onKeyDown={trapFocus}
    >
      <Header>
        <Title id={TITLE_ID}>
          <TitleIcon />
          {/* Um item só no flex do título: o gap não separa "Regras" do complemento. */}
          <TitleText>
            {docked ? (
              <>
                Regras <TitleSub>· criação de personagem</TitleSub>
              </>
            ) : (
              "Regras"
            )}
          </TitleText>
        </Title>
        <CloseX ref={closeRef} type="button" aria-label="Fechar regras" onClick={() => onCloseRef.current()}>
          <XIcon $docked={docked} />
        </CloseX>
      </Header>

      <Body $docked={docked}>
        {data && (
          <Chips ref={chipsRef} aria-label="Sumário das regras" $docked={docked} $rows={breaks.size > 0}>
            <ol>
              {data.map((c, i) => (
                <Fragment key={c.slug}>
                  {breaks.has(i) && <ChipBreak aria-hidden="true" role="presentation" />}
                  <li>
                    <Chip
                      href={`#${c.slug}`}
                      aria-current={c.slug === active ? "location" : undefined}
                      onClick={onChipClick(c.slug)}
                    >
                      {c.label}
                      {c.comingSoon && <ComingSoonBadge />}
                    </Chip>
                  </li>
                </Fragment>
              ))}
            </ol>
          </Chips>
        )}

        <Reading ref={setReading} $docked={docked}>
          {isLoading && (
            <Loading role="status" aria-label="Carregando regras">
              <Spinner aria-hidden="true" />
            </Loading>
          )}
          {isError && (
            <ErrorBox role="alert">
              <p>Não foi possível carregar as regras.</p>
              <PrimaryButton type="button" onClick={() => void refetch()}>
                Tentar de novo
              </PrimaryButton>
            </ErrorBox>
          )}
          {data?.map(
            (c, i) =>
              mounted.has(i) && (
                <ChapterSection key={c.slug} id={c.slug}>
                  <ChapterTitle $docked={docked}>
                    {c.title}
                    {c.comingSoon && <ComingSoonBadge />}
                  </ChapterTitle>
                  <RulesMarkdown chapter={c} onNavigate={onNavigate} chapterSlugs={slugs} />
                </ChapterSection>
              ),
          )}
        </Reading>
      </Body>
    </Panel>
  );
}

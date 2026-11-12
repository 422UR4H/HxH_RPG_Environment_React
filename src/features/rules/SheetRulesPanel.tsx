import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useSheetRules } from "../../hooks/useSheetRules";
import useMediaQuery from "../../hooks/useMediaQuery";
import { breakpoints } from "../../styles/breakpoints";
import ComingSoonBadge from "../../components/ions/ComingSoonBadge";
import { PrimaryButton, Spinner } from "../../components/templates/PageState.styles";
import RulesMarkdown from "./RulesMarkdown";
import { headingId } from "./markdownMapping";
import { useActiveChapter } from "./useActiveChapter";
import {
  Body,
  ChapterSection,
  ChapterTitle,
  Chip,
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

export default function SheetRulesPanel({ startSlug, onClose, onChapterChange }: SheetRulesPanelProps) {
  const docked = useMediaQuery(DOCKED_QUERY);
  const { data, isLoading, isError, refetch } = useSheetRules();
  const panelRef = useRef<HTMLElement>(null);
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
  const observed = useActiveChapter(slugs, reading);
  const active = observed ?? startSlug;

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

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
    if (startedRef.current || !data || !reading) return;
    startedRef.current = true;
    byId(reading, startSlug)?.scrollIntoView({ block: "start" });
  }, [data, reading, startSlug]);

  const onNavigate = useCallback(
    (slug: string, anchor?: string) => {
      const target = (anchor ? byId(reading, headingId(slug, anchor)) : null) ?? byId(reading, slug);
      target?.scrollIntoView({ block: "start", behavior: "smooth" });
    },
    [reading],
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

  const a11y = docked
    ? ({ as: "aside", role: "complementary" } as const)
    : ({ as: "div", role: "dialog", "aria-modal": true } as const);

  return (
    <Panel ref={panelRef} id={RULES_PANEL_ID} {...a11y} $docked={docked}
      $width={RULES_PANEL_WIDTH}
      aria-labelledby={TITLE_ID} onKeyDown={trapFocus}>
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
          <Chips ref={chipsRef} aria-label="Sumário das regras" $docked={docked}>
            <ol>
              {data.map((c) => (
                <li key={c.slug}>
                  <Chip
                    href={`#${c.slug}`}
                    aria-current={c.slug === active ? "location" : undefined}
                    onClick={onChipClick(c.slug)}
                  >
                    {c.label}
                    {c.comingSoon && <ComingSoonBadge />}
                  </Chip>
                </li>
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
          {data?.map((c) => (
            <ChapterSection key={c.slug} id={c.slug}>
              <ChapterTitle $docked={docked}>
                {c.title}
                {c.comingSoon && <ComingSoonBadge />}
              </ChapterTitle>
              <RulesMarkdown chapter={c} onNavigate={onNavigate} chapterSlugs={slugs} />
            </ChapterSection>
          ))}
        </Reading>
      </Body>
    </Panel>
  );
}

import { useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/** Parâmetro da URL com o capítulo em que o painel de regras abriu (`?regras=atributos`). */
export const RULES_PARAM = "regras";

type RulesState = Record<string, unknown> & { rulesOpenedHere?: boolean };

const asState = (state: unknown): RulesState =>
  state && typeof state === "object" ? (state as RulesState) : {};

/**
 * Painel de regras da ficha preso à URL: abrir empilha uma entrada no histórico, e o voltar do
 * navegador fecha o painel sem sair da ficha. Só muda a query string, então a rota não remonta e
 * o formulário não perde nada. O último capítulo lido fica só na memória — nada vai pro navegador.
 *
 * O último capítulo é ref, não estado: muda a cada troca de capítulo ao rolar, e como estado
 * re-renderizava a ficha inteira em cada troca. Só o "?" lê, na hora do clique.
 */
export function useRulesPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const lastSlugRef = useRef<string | null>(null);
  const setLastSlug = useCallback((slug: string) => {
    lastSlugRef.current = slug;
  }, []);
  const getLastSlug = useCallback(() => lastSlugRef.current, []);

  const openSlug = new URLSearchParams(location.search).get(RULES_PARAM);

  const open = useCallback(
    (slug: string) => {
      const params = new URLSearchParams(location.search);
      params.set(RULES_PARAM, slug);
      navigate(
        { pathname: location.pathname, search: `?${params}`, hash: location.hash },
        { state: { ...asState(location.state), rulesOpenedHere: true } },
      );
    },
    [location, navigate],
  );

  const close = useCallback(() => {
    const state = asState(location.state);
    // A entrada é nossa: voltar a desfaz, sem deixar entrada morta no histórico.
    if (state.rulesOpenedHere) {
      navigate(-1);
      return;
    }
    // Link direto (`?regras=` já na chegada): não há entrada nossa, então troca a URL.
    const params = new URLSearchParams(location.search);
    params.delete(RULES_PARAM);
    const search = params.toString();
    navigate(
      { pathname: location.pathname, search: search ? `?${search}` : "", hash: location.hash },
      { replace: true, state: location.state },
    );
  }, [location, navigate]);

  return { openSlug, open, close, getLastSlug, setLastSlug };
}

import { useEffect, useState } from "react";

// Faixa fina perto do topo da área de leitura: o capítulo ativo é a primeira `section` que a
// atravessa. A seção cobre o capítulo inteiro, então um capítulo longo continua ativo enquanto
// o corpo dele passa pela faixa, mesmo com o título já fora da vista.
const BAND = "-8% 0px -88% 0px";

/** Capítulo em leitura dentro de `root` (as `section id={slug}`). Sem IntersectionObserver
 *  (jsdom), devolve `undefined` e quem chama usa o capítulo de abertura. */
export function useActiveChapter(slugs: string[], root: HTMLElement | null): string | undefined {
  const [active, setActive] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!root || slugs.length === 0 || typeof IntersectionObserver === "undefined") return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        }
        // Entre dois capítulos a faixa pode ficar vazia: mantém o último.
        const first = slugs.find((s) => visible.has(s));
        if (first) setActive(first);
      },
      { root, rootMargin: BAND, threshold: 0 },
    );
    for (const slug of slugs) {
      const section = root.querySelector(`section[id="${slug}"]`);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, [slugs, root]);

  return active;
}

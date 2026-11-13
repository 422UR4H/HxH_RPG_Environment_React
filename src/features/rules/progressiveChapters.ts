/**
 * Ordem em que os capítulos montam ao abrir o painel: o pedido primeiro, depois os vizinhos
 * alternando um abaixo e um acima. Montar os dez de uma vez travava a abertura (o Markdown de
 * todos passava pelo parser no mesmo quadro); assim o capítulo pedido aparece logo e o resto
 * chega nos quadros seguintes, perto do que o jogador lê primeiro.
 */
export function chapterMountOrder(count: number, start: number): number[] {
  const first = start >= 0 && start < count ? start : 0;
  const order = count > 0 ? [first] : [];
  for (let d = 1; order.length < count; d++) {
    if (first + d < count) order.push(first + d);
    if (first - d >= 0) order.push(first - d);
  }
  return order;
}

/** Agenda a montagem do próximo capítulo numa tarefa nova, depois do quadro atual. Devolve
 *  o cancelamento. Separado do componente para os testes controlarem o ritmo. */
export function scheduleNextChapter(mount: () => void): () => void {
  const id = setTimeout(mount, 0);
  return () => clearTimeout(id);
}

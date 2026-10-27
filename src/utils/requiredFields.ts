/**
 * Mensagem própria para obrigatórios vazios, no lugar do balão do navegador (FOR-06): os
 * formulários usam `noValidate` e chamam isto antes de enviar. Só espaço conta como vazio.
 */
export function missingRequiredMessage(fields: { label: string; value: string }[]): string | null {
  const missing = fields.filter((f) => !f.value.trim()).map((f) => f.label);
  if (missing.length === 0) return null;
  if (missing.length === 1) return `Preencha o campo obrigatório: ${missing[0]}.`;
  const list = `${missing.slice(0, -1).join(", ")} e ${missing[missing.length - 1]}`;
  return `Preencha os campos obrigatórios: ${list}.`;
}

/**
 * Data digitada pela metade: o navegador entrega `value` vazio e marca `badInput`. Sem o balão
 * (`noValidate`), ela sumiria em silêncio (opcional) ou pareceria "não preenchida" (obrigatória).
 */
export function incompleteInputMessage(form: HTMLFormElement): string | null {
  const hasBadInput = Array.from(form.elements).some(
    (el) => el instanceof HTMLInputElement && el.validity.badInput,
  );
  return hasBadInput ? "Há uma data incompleta: complete-a ou apague-a." : null;
}

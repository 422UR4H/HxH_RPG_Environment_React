/**
 * Parte um rótulo em CamelCase entre a minúscula e a maiúscula seguinte
 * ("ThrowingDagger" -> ["Throwing", "Dagger"]), para o rótulo poder quebrar de linha
 * ali (com `<wbr>`) sem quebrar no meio de uma palavra. Espaços não mudam: o navegador já quebra neles.
 */
export function camelCaseSegments(label: string): string[] {
  return label.split(/(?<=[a-zà-ÿ])(?=[A-ZÀ-Þ])/);
}

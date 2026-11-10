import { useState } from "react";
import { charLength } from "../constants/fieldLimits";

export interface FieldRule {
  value: string;
  /** Obrigatório: vazio (só espaço conta como vazio) gera "Campo obrigatório.". */
  required?: boolean;
  min?: number;
  /** Mensagem de `min`; sem ela, cai numa genérica. */
  minMessage?: string;
  /** Só gera a nota neutra ao atingir o limite; o `maxLength` do campo é quem impede de passar. */
  max?: number;
  /** Regra própria (formato, intervalo de datas…): devolve a mensagem ou null. Só roda com valor. */
  validate?: (value: string) => string | null;
  /** Campo travado/fora do formulário: sem erro, sem nota, ignorado no envio. */
  disabled?: boolean;
}

export const REQUIRED_MESSAGE = "Campo obrigatório.";

function ruleError(rule: FieldRule): string | null {
  if (rule.disabled) return null;
  if (!rule.value.trim()) return rule.required ? REQUIRED_MESSAGE : null;
  if (rule.min !== undefined && charLength(rule.value) < rule.min) {
    return rule.minMessage ?? `Use pelo menos ${rule.min} caracteres.`;
  }
  return rule.validate?.(rule.value) ?? null;
}

/** Rola até o campo e o foca (o `id` do elemento é o nome da regra). */
export function focusField(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView?.({ block: "center" });
  el.focus();
}

/**
 * Validação por campo, sem biblioteca. As regras são recalculadas a cada render a partir dos
 * valores do formulário. O erro só aparece com o campo "tocado" (blur, mudança de data ou envio);
 * depois disso revalida a cada mudança. A nota de limite aparece sempre que o texto atinge o máximo.
 */
export default function useFieldValidation<K extends string>(rules: Record<K, FieldRule>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const names = Object.keys(rules) as K[];

  const touch = (name: K) => setTouched((prev) => (prev[name] ? prev : { ...prev, [name]: true }));

  const errorFor = (name: K): string | null => (touched[name] ? ruleError(rules[name]) : null);

  const noticeFor = (name: K): string | null => {
    const { max, value, disabled } = rules[name];
    if (disabled || max === undefined || charLength(value) < max) return null;
    return `Limite de ${max} caracteres atingido.`;
  };

  /** Marca todos como tocados e devolve o primeiro campo inválido (ordem das regras), ou null. */
  const validateAll = (): K | null => {
    setTouched(Object.fromEntries(names.map((n) => [n, true])) as Record<K, boolean>);
    return names.find((n) => ruleError(rules[n]) !== null) ?? null;
  };

  return { errorFor, noticeFor, touch, validateAll };
}

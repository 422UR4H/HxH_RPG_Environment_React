import { formatDamage } from "../../../utils/dice";
import type { WeaponInfo } from "../../../types/rules";

/**
 * Monta a busca "arma -> dano formatado" a partir do catálogo. Case-insensitive no nome inteiro:
 * as chaves da ficha chegam como `throwingDagger` e as listas da classe como `ThrowingDagger`.
 * Devolve undefined para arma desconhecida ou catálogo ainda não carregado (dano ausente é
 * silencioso na UI).
 */
export function buildWeaponDamageLookup(
  weapons: WeaponInfo[] | undefined,
): (weapon: string) => string | undefined {
  const byName = new Map<string, string>();
  for (const w of weapons ?? []) {
    // `dice` nulo na rede conta como lista vazia; sem nada a mostrar, o dano fica ausente (D9).
    const damage = formatDamage(w.dice ?? [], w.flatDamage);
    if (damage) byName.set(w.name.toLowerCase(), damage);
  }
  return (weapon) => byName.get(weapon.toLowerCase());
}

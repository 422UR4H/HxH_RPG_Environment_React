import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { rulesService } from "../services/rulesService";
import { buildWeaponDamageLookup } from "../features/sheet/utils/weaponDamage";

/** Devolve `(arma) => dano formatado | undefined`. Catálogo estático (só muda com deploy) e rota
 *  pública: sem token na chave nem guarda `enabled`. A identidade da função só muda com os dados. */
export function useWeaponDamage() {
  const { data } = useQuery({
    queryKey: ["weaponsCatalogue"],
    queryFn: rulesService.getWeapons,
    staleTime: Infinity,
    retry: 1,
  });
  return useMemo(() => buildWeaponDamageLookup(data), [data]);
}

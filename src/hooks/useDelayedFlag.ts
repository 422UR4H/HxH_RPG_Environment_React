import { useEffect, useState } from "react";

/** `false` até passar `ms` desde a montagem; `true` depois. O timer é limpo ao desmontar. */
export default function useDelayedFlag(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(id);
  }, [ms]);

  return elapsed;
}

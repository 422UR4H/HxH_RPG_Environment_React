/**
 * Chooses which set of pieces the tactical map may render.
 *
 * There are two sources and they are NOT equally trustworthy:
 *
 * - `GET /maps/:id` (REST) masks unrevealed secret doors and drops `visible=false`
 *   pieces, but it does **not** apply line of sight. `applyRoleFilter` in the backend
 *   defers that to the WS layer, the only place that holds per-player visibility
 *   polygons. So the REST payload lists every visible piece on the map.
 * - `map_full_state` (WS) is filtered per player by `FilterMapState`.
 *
 * For a player, therefore, the WS set is the only safe one, and an empty board is the
 * correct thing to show until it arrives: a blank map is visible and debuggable, while
 * the REST fallback silently reveals where every character is standing. React Query
 * refetches on window focus, so the REST payload keeps coming back — the leak is not
 * limited to the first paint.
 *
 * The master is entitled to the whole board, so REST is a fine source for them.
 */
export function visibleBoardPieces<T>(
  fromWebSocket: T[] | null,
  fromRest: T[] | undefined,
  isMaster: boolean,
): T[] {
  if (fromWebSocket) return fromWebSocket;
  return isMaster ? (fromRest ?? []) : [];
}

import { httpClient } from "./httpClient";
import config from "./config";
import type { TacticalMap, GridShape, BgImage, Piece, MatchMapResponse } from "../types/tacticalMap";

export const mapsService = {
  createMap: (
    token: string,
    campaignId: string,
    data: { name: string; description?: string; grid: GridShape; bg?: BgImage; pieces?: Piece[] },
  ): Promise<TacticalMap> =>
    httpClient
      .post<{ map: TacticalMap }>(
        `/campaigns/${campaignId}/maps`,
        data,
        config(token),
      )
      .then(({ data: res }) => res.map),

  listMaps: (token: string, campaignId: string): Promise<TacticalMap[]> =>
    httpClient
      .get<{ maps: TacticalMap[] }>(
        `/campaigns/${campaignId}/maps`,
        config(token),
      )
      .then(({ data: res }) => res.maps ?? []),

  getMap: (token: string, mapId: string): Promise<TacticalMap> =>
    httpClient
      .get<{ map: TacticalMap }>(`/maps/${mapId}`, config(token))
      .then(({ data: res }) => res.map),

  updateMap: (token: string, mapId: string, data: object): Promise<void> =>
    httpClient
      .put(`/maps/${mapId}`, data, config(token))
      .then(() => undefined),

  deleteMap: (token: string, mapId: string): Promise<void> =>
    httpClient
      .delete(`/maps/${mapId}`, config(token))
      .then(() => undefined),

  attachMatchMap: (
    token: string,
    matchId: string,
    mapId: string,
  ): Promise<MatchMapResponse> =>
    httpClient
      .post<{ matchMap: Record<string, unknown> }>(
        `/matches/${matchId}/map`,
        { mapUuid: mapId },
        config(token),
      )
      .then(({ data: res }) => res.matchMap as MatchMapResponse),

  getMatchMap: (
    token: string,
    matchId: string,
  ): Promise<MatchMapResponse | null> =>
    httpClient
      .get<{ matchMap: Record<string, unknown> } | null>(
        `/matches/${matchId}/map`,
        config(token),
      )
      .then(({ data: res }) =>
        res?.matchMap ? (res.matchMap as MatchMapResponse) : null,
      )
      .catch((err: unknown) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        // 204 No Content: backend returns no body — treat as "no map attached"
        if (status === 204 || !status) return null;
        throw err;
      }),

  detachMatchMap: (token: string, matchId: string): Promise<void> =>
    httpClient
      .delete(`/matches/${matchId}/map`, config(token))
      .then(() => undefined),
};

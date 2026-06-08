import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
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
        objToSnakeCase(data),
        config(token),
      )
      .then(({ data: res }) => objToCamelCase<TacticalMap>(res.map)),

  listMaps: (token: string, campaignId: string): Promise<TacticalMap[]> =>
    httpClient
      .get<{ maps: TacticalMap[] }>(
        `/campaigns/${campaignId}/maps`,
        config(token),
      )
      .then(({ data: res }) =>
        objToCamelCase<{ maps: TacticalMap[] }>(res).maps ?? [],
      ),

  getMap: (token: string, mapId: string): Promise<TacticalMap> =>
    httpClient
      .get<{ map: TacticalMap }>(`/maps/${mapId}`, config(token))
      .then(({ data: res }) => objToCamelCase<TacticalMap>(res.map)),

  updateMap: (token: string, mapId: string, data: object): Promise<void> =>
    httpClient
      .put(`/maps/${mapId}`, objToSnakeCase(data), config(token))
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
      .post<{ match_map: Record<string, unknown> }>(
        `/matches/${matchId}/map`,
        objToSnakeCase({ mapUuid: mapId }),
        config(token),
      )
      .then(({ data: res }) => objToCamelCase<MatchMapResponse>(res.match_map)),

  getMatchMap: (
    token: string,
    matchId: string,
  ): Promise<MatchMapResponse | null> =>
    httpClient
      .get<{ match_map: Record<string, unknown> } | null>(
        `/matches/${matchId}/map`,
        config(token),
      )
      .then(({ data: res }) =>
        res?.match_map ? objToCamelCase<MatchMapResponse>(res.match_map) : null,
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

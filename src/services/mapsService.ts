import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { TacticalMap, GridShape } from "../types/tacticalMap";

export const mapsService = {
  createMap: (
    token: string,
    campaignId: string,
    data: { name: string; description?: string; grid: GridShape },
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
};

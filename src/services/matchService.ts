import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { Match } from "../types/campaign";

export const matchService = {
  createMatch: (token: string, matchData: any) =>
    httpClient
      .post<{ match: Match }>(
        "/matches",
        objToSnakeCase(matchData),
        config(token)
      )
      .then((response) => {
        const matchData = response.data.match || {};
        return {
          ...response,
          data: objToCamelCase<Match>(matchData),
        };
      }),
};

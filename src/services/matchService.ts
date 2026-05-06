import { httpClient } from "./httpClient";
import { objToCamelCase, objToSnakeCase } from "../utils/caseConverter";
import config from "./config";
import type { Match, Enrollment, Participant } from "../types/match";

export const matchService = {
  createMatch: (token: string, matchData: object) =>
    httpClient
      .post<{ match: Match }>("/matches", objToSnakeCase(matchData), config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Match>(response.data.match ?? {}),
      })),

  getMatchDetails: (token: string, matchId: string) =>
    httpClient
      .get<{ match: Match }>(`/matches/${matchId}`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Match>(response.data.match),
      })),

  getEnrollments: (token: string, matchId: string) =>
    httpClient
      .get<{ enrollments: Enrollment[] }>(`/matches/${matchId}/enrollments`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Enrollment[]>(response.data.enrollments),
      })),

  getParticipants: (token: string, matchId: string) =>
    httpClient
      .get<{ participants: Participant[] }>(`/matches/${matchId}/participants`, config(token))
      .then((response) => ({
        ...response,
        data: objToCamelCase<Participant[]>(response.data.participants),
      })),

  acceptEnrollment: (token: string, enrollmentId: string) =>
    httpClient.post(`/enrollments/${enrollmentId}/accept`, {}, config(token)),

  rejectEnrollment: (token: string, enrollmentId: string) =>
    httpClient.post(`/enrollments/${enrollmentId}/reject`, {}, config(token)),
};

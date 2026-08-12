import { httpClient } from "./httpClient";
import config from "./config";
import type { Match, Enrollment, Participant } from "../types/match";

export const matchService = {
  createMatch: (token: string, matchData: object): Promise<Match> =>
    httpClient
      .post<{ match: Match }>("/matches", matchData, config(token))
      .then(({ data }) => data.match),

  getMatchDetails: (token: string, matchId: string): Promise<Match> =>
    httpClient
      .get<{ match: Match }>(`/matches/${matchId}`, config(token))
      .then(({ data }) => data.match),

  getEnrollments: (token: string, matchId: string): Promise<Enrollment[]> =>
    httpClient
      .get<{ enrollments: Enrollment[] }>(
        `/matches/${matchId}/enrollments`,
        config(token)
      )
      .then(({ data }) => data.enrollments),

  getParticipants: (token: string, matchId: string): Promise<Participant[]> =>
    httpClient
      .get<{ participants: Participant[] }>(
        `/matches/${matchId}/participants`,
        config(token)
      )
      .then(({ data }) => data.participants),

  acceptEnrollment: (token: string, enrollmentId: string): Promise<void> =>
    httpClient
      .post(`/enrollments/${enrollmentId}/accept`, {}, config(token))
      .then(() => undefined),

  rejectEnrollment: (token: string, enrollmentId: string): Promise<void> =>
    httpClient
      .post(`/enrollments/${enrollmentId}/reject`, {}, config(token))
      .then(() => undefined),

  updateMatch: (token: string, matchId: string, matchData: object): Promise<Match> =>
    httpClient
      .patch<{ match: Match }>(`/matches/${matchId}`, matchData, config(token))
      .then(({ data }) => data.match),

  deleteMatch: (token: string, matchId: string): Promise<void> =>
    httpClient
      .delete(`/matches/${matchId}`, config(token))
      .then(() => undefined),

  enrollCharacterSheet: (
    token: string,
    sheetUuid: string,
    matchUuid: string
  ): Promise<void> =>
    httpClient
      .post(
        "/enrollments/charactersheets/enroll",
        { sheetUuid, matchUuid },
        config(token)
      )
      .then(() => undefined),
};

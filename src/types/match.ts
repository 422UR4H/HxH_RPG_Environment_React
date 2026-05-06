import type { CharacterBaseSummary, CharacterPrivateSummary } from "./characterSheet";

export interface Match {
  uuid: string;
  campaignUuid: string;
  masterUuid: string;
  title: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;
  isPublic: boolean;
  gameScheduledAt: string;
  gameStartAt?: string;
  storyStartAt: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type CharacterPrivateOnly = Omit<
  CharacterPrivateSummary,
  keyof CharacterBaseSummary
>;

export interface CharacterSheetWithVisibility extends CharacterBaseSummary {
  private?: CharacterPrivateOnly;
}

export interface PlayerRef {
  uuid: string;
  nick: string;
}

export interface Enrollment {
  uuid: string;
  status: string;
  createdAt: string;
  characterSheet: CharacterSheetWithVisibility;
  player: PlayerRef;
}

export interface Participant {
  uuid: string;
  joinedAt: string;
  leftAt?: string;
  characterSheet: CharacterSheetWithVisibility;
}

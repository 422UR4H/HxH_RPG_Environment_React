import type { StatusBar } from "./characterSheet";

export interface CampaignBase {
  uuid: string;
  masterUuid: string;
  name: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
  storyCurrentAt?: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
  matches?: Match[];
}

export interface CampaignMaster extends CampaignBase {
  characterSheets: CharacterPrivateSummary[];
  pendingSheets: CharacterPrivateSummary[];
}

export interface CampaignPlayer extends CampaignBase {
  characterSheets: CharacterPublicSummary[];
}

export interface Match {
  uuid: string;
  campaignUuid: string;
  title: string;
  briefInitialDescription: string;
  briefFinalDescription?: string;
  isPublic: boolean;
  gameStartAt: string;
  storyStartAt: string;
  storyEndAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterBaseSummary {
  uuid: string;
  playerUuid?: string;
  masterUuid?: string;
  campaignUuid?: string;
  nickName: string;
  storyStartAt?: string;
  storyCurrentAt?: string;
  deadAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterPrivateSummary extends CharacterBaseSummary {
  fullName: string;
  alignment: string;
  characterClass: string;
  birthday: string;
  categoryName: string;
  currHexValue?: number;
  level: number;
  points: number;
  talentLvl: number;
  physicalsLvl: number;
  mentalsLvl: number;
  spiritualsLvl: number;
  skillsLvl: number;
  stamina: StatusBar;
  health: StatusBar;
}

export interface CharacterPublicSummary extends CharacterBaseSummary {
  // only base fields
}

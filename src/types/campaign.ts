import type {
  CharacterBaseSummary,
  CharacterPrivateSummary,
  CharacterPublicSummary,
} from "./characterSheet";
import type { Match } from "./match";

export type {
  CharacterBaseSummary,
  CharacterPrivateSummary,
  CharacterPublicSummary,
  Match,
};

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
  myPendingSheet?: CharacterPrivateSummary;
}

export interface CampaignPlayer extends CampaignBase {
  characterSheets: CharacterPublicSummary[];
}

export interface CampaignEditResult {
  uuid: string;
  masterUuid: string;
  name: string;
  briefInitialDescription: string;
  description: string;
  isPublic: boolean;
  callLink: string;
  storyStartAt: string;
  storyCurrentAt?: string;
  updatedAt: string;
}

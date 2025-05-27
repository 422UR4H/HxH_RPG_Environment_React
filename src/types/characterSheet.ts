export interface CharacterSheetSummary {
  uuid: string;
  nickName: string;
  fullName: string;
  alignment: string;
  characterClass: string;
  birthday: string;
  categoryName: string;
  currHexValue: number | null;
  staminaCurrPts: number;
  healthCurrPts: number;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterSheetResponse {
  characterSheets: CharacterSheetSummary[];
}

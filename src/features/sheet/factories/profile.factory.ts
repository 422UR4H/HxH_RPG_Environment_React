import type { Profile } from "../../../types/characterSheet";

export function createEmptyProfile(): Profile {
  return {
    nickname: "",
    fullname: "",
    alignment: "",
    description: "",
    briefDescription: "",
    birthday: "",
    cover: undefined,
    avatar: undefined,
  };
}

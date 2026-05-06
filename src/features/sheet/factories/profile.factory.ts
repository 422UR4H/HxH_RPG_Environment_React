import type { Profile } from "../../../types/characterSheet";

export function createEmptyProfile(): Profile {
  return {
    nickname: "",
    fullname: "",
    alignment: "",
    description: "",
    briefDescription: "",
    birthday: "",
    age: 0,
    cover: undefined,
    avatar: undefined,
  };
}

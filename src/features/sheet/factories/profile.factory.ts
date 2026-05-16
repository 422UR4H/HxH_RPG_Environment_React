import type { Profile } from "../../../types/characterSheet";

export function createEmptyProfile(): Profile {
  const today = new Date();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return {
    nickname: "",
    fullname: "",
    alignment: "",
    description: "",
    briefDescription: "",
    birthday: `0000-${mm}-${dd}T00:00:00.000Z`,
    age: 0,
    cover: undefined,
    avatar: undefined,
  };
}

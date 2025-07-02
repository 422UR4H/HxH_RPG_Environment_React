import type { CharacterPrivateSummary } from "../../../types/campaign";

/**
 * Orders the characters of a campaign according to the rules:
 * 1. Pending characters first
 * 2. Player characters second
 * 3. NPCs third
 * 4. Dead characters last
 */
export function getSortedCharacters(
  characters: CharacterPrivateSummary[] = [],
  pendingSheets: CharacterPrivateSummary[] = []
): (CharacterPrivateSummary & { isPending?: boolean })[] {
  const allCharacters = [
    ...pendingSheets.map((sheet) => ({ ...sheet, isPending: true })),
    ...characters.map((sheet) => ({ ...sheet, isPending: false })),
  ] as (CharacterPrivateSummary & { isPending?: boolean })[];

  return allCharacters.sort((a, b) => {
    // 1. Pendents
    if (a.isPending && !b.isPending) return -1;
    if (!a.isPending && b.isPending) return 1;

    // 2. Character Players
    const aIsPlayer = !!a.playerUuid;
    const bIsPlayer = !!b.playerUuid;
    if (aIsPlayer && !bIsPlayer) return -1;
    if (!aIsPlayer && bIsPlayer) return 1;

    // 3. NPCs (without playerUuid - sorted above)

    // 4. Characters dead last
    const aIsDead = !!a.deadAt;
    const bIsDead = !!b.deadAt;
    if (!aIsDead && bIsDead) return -1;
    if (aIsDead && !bIsDead) return 1;

    // default alphabetical sorting by nickName
    return a.nickName.localeCompare(b.nickName);
  });
}

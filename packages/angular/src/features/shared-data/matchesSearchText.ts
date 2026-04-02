export function matchesSearchText(
  itemText: string,
  searchQuery: string | undefined,
): boolean {
  const terms =
    searchQuery
      ?.trim()
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t !== "") ?? [];

  if (terms.length === 0) return true;

  const lowerItemText = itemText.toLowerCase();
  return terms.every((term) => lowerItemText.includes(term.toLowerCase()));
}

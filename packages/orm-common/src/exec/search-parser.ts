/**
 * Search query parsing result (LIKE pattern)
 */
export interface ParsedSearchQuery {
  /** General search terms (OR condition) - LIKE pattern */
  or: string[];
  /** Required search terms (AND condition, + prefix or quotes) - LIKE pattern */
  must: string[];
  /** Excluded search terms (NOT condition, - prefix) - LIKE pattern */
  not: string[];
}

// Replace escape sequences with placeholders
const ESC = {
  BACKSLASH: "\x00BACKSLASH\x00",
  ASTERISK: "\x00ASTERISK\x00",
  PERCENT: "\x00PERCENT\x00",
  QUOTE: "\x00QUOTE\x00",
  PLUS: "\x00PLUS\x00",
  MINUS: "\x00MINUS\x00",
};

/**
 * Parse search query string and convert to SQL LIKE pattern.
 *
 * ## Search Syntax
 *
 * | Syntax | Meaning | Example |
 * |--------|---------|---------|
 * | `term1 term2` | OR (one of them) | `apple banana` |
 * | `+term` | Required (AND) | `+apple +banana` |
 * | `-term` | Excluded (NOT) | `apple -banana` |
 * | `"exact phrase"` | Exact match (required) | `"delicious fruit"` |
 * | `*` | Wildcard | `app*` → `app%` |
 *
 * ## Escape Sequences
 *
 * | Input | Meaning |
 * |-------|---------|
 * | `\\` | Literal `\` |
 * | `\*` | Literal `*` |
 * | `\%` | Literal `%` |
 * | `\"` | Literal `"` |
 * | `\+` | Literal `+` |
 * | `\-` | Literal `-` |
 *
 * ## Special Cases
 *
 * - Unclosed quotes (`"text`) are treated as regular text including the quote character.
 *
 * ## Examples
 *
 * ```typescript
 * parseSearchQuery('apple "delicious fruit" -banana +strawberry')
 * // Result:
 * // {
 * //   or: ["%apple%"],
 * //   must: ["%delicious fruit%", "%strawberry%"],
 * //   not: ["%banana%"]
 * // }
 *
 * parseSearchQuery('app* test')
 * // Result:
 * // {
 * //   or: ["app%", "%test%"],  // app* starts with "app", test is substring match
 * //   must: [],
 * //   not: []
 * // }
 *
 * parseSearchQuery('app\\*test')  // escaped *
 * // Result:
 * // {
 * //   or: ["%app*test%"],  // literal *
 * //   must: [],
 * //   not: []
 * // }
 * ```
 *
 * @param searchText Search query string
 * @returns Parsed search query object (LIKE pattern)
 */
export function parseSearchQuery(searchText: string): ParsedSearchQuery {
  const result: ParsedSearchQuery = {
    or: [],
    must: [],
    not: [],
  };

  if (searchText.trim() === "") {
    return result;
  }

  let processed = searchText
    .replace(/\\\\/g, ESC.BACKSLASH)
    .replace(/\\\*/g, ESC.ASTERISK)
    .replace(/\\%/g, ESC.PERCENT)
    .replace(/\\"/g, ESC.QUOTE)
    .replace(/\\\+/g, ESC.PLUS)
    .replace(/\\-/g, ESC.MINUS);

  // Extract quoted sections
  const quotedRegex = /([+-]?)"([^"]*)"/g;
  let match: RegExpExecArray | null;

  while ((match = quotedRegex.exec(processed)) != null) {
    const prefix = match[1];
    let term = match[2];

    if (term.trim() === "") continue;

    const pattern = termToLikePattern(term);

    if (prefix === "+") {
      result.must.push(pattern);
    } else if (prefix === "-") {
      result.not.push(pattern);
    } else {
      // Quoted text is treated as must (exact match = required)
      result.must.push(pattern);
    }
  }

  // Remove quoted sections
  processed = processed.replace(/[+-]?"[^"]*"/g, " ");

  // Split tokens by whitespace
  const tokens = processed.split(/\s+/).filter((t) => t.length > 0);

  for (let token of tokens) {
    let targetArray = result.or;

    // Handle + or - prefix
    if (token.startsWith("+")) {
      targetArray = result.must;
      token = token.slice(1);
    } else if (token.startsWith("-")) {
      targetArray = result.not;
      token = token.slice(1);
    }

    if (token.trim() === "") continue;

    const pattern = termToLikePattern(token);
    targetArray.push(pattern);
  }

  return result;
}

/**
 * Convert search term to SQL LIKE pattern (internal function)
 *
 * Wildcard rules:
 * - `apple` (no wildcard) → `%apple%` (substring match, default)
 * - `apple*` → `apple%` (starts with)
 * - `*apple` → `%apple` (ends with)
 * - `*apple*` → `%apple%` (explicit substring)
 * - `a*ple` → `a%ple` (in the middle)
 */
function termToLikePattern(term: string): string {
  // Convert wildcard * to temporary marker (escaped ones are already handled as ESC.ASTERISK)
  const WILDCARD = "\x01WILDCARD\x01";
  const hasWildcard = term.includes("*");
  let pattern = term.replace(/\*/g, WILDCARD);

  // Escape SQL LIKE special characters (\ → \\, % → \%, _ → \_, [ → \[)
  pattern = pattern
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[");

  // Convert wildcard marker → % (SQL wildcard)
  pattern = pattern.replaceAll(WILDCARD, "%");

  // Restore escape placeholders
  pattern = pattern
    .replaceAll(ESC.BACKSLASH, "\\\\") // \\ → SQL \\
    .replaceAll(ESC.ASTERISK, "*") // \* → literal * (not special in SQL)
    .replaceAll(ESC.PERCENT, "\\%") // \% → SQL \%
    .replaceAll(ESC.QUOTE, '"')
    .replaceAll(ESC.PLUS, "+")
    .replaceAll(ESC.MINUS, "-");

  // If no wildcard, add % on both sides (default substring search)
  // If wildcard exists, use the pattern as specified by the user
  if (hasWildcard) {
    return pattern;
  }

  return `%${pattern}%`;
}

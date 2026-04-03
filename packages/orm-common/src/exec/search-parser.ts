/**
 * 검색 쿼리 파싱 결과 (LIKE 패턴)
 */
export interface ParsedSearchQuery {
  /** 일반 검색어 (OR 조건) - LIKE 패턴 */
  or: string[];
  /** 필수 검색어 (AND 조건, + 접두사 또는 따옴표) - LIKE 패턴 */
  must: string[];
  /** 제외 검색어 (NOT 조건, - 접두사) - LIKE 패턴 */
  not: string[];
}

// 이스케이프 시퀀스를 플레이스홀더로 치환
const ESC = {
  BACKSLASH: "\x00BACKSLASH\x00",
  ASTERISK: "\x00ASTERISK\x00",
  PERCENT: "\x00PERCENT\x00",
  QUOTE: "\x00QUOTE\x00",
  PLUS: "\x00PLUS\x00",
  MINUS: "\x00MINUS\x00",
};

/**
 * 검색 쿼리 문자열을 파싱하여 SQL LIKE 패턴으로 변환한다.
 *
 * ## 검색 구문
 *
 * | 구문 | 의미 | 예시 |
 * |--------|---------|---------|
 * | `term1 term2` | OR (하나 이상 일치) | `apple banana` |
 * | `+term` | 필수 포함 (AND) | `+apple +banana` |
 * | `-term` | 제외 (NOT) | `apple -banana` |
 * | `"exact phrase"` | 정확한 구문 일치 (필수) | `"맛있는 과일"` |
 * | `*` | 와일드카드 | `app*` → `app%` |
 *
 * ## 이스케이프 시퀀스
 *
 * | 입력 | 의미 |
 * |-------|---------|
 * | `\\` | 리터럴 `\` |
 * | `\*` | 리터럴 `*` |
 * | `\%` | 리터럴 `%` |
 * | `\"` | 리터럴 `"` |
 * | `\+` | 리터럴 `+` |
 * | `\-` | 리터럴 `-` |
 *
 * ## 특수 케이스
 *
 * - 닫히지 않은 따옴표(`"text`)는 따옴표를 포함한 일반 텍스트로 처리된다.
 *
 * ## 예시
 *
 * ```typescript
 * parseSearchQuery('apple "delicious fruit" -banana +strawberry')
 * // 결과:
 * // {
 * //   or: ["%apple%"],
 * //   must: ["%delicious fruit%", "%strawberry%"],
 * //   not: ["%banana%"]
 * // }
 *
 * parseSearchQuery('app* test')
 * // 결과:
 * // {
 * //   or: ["app%", "%test%"],  // app*는 "app"으로 시작, test는 부분 문자열 검색
 * //   must: [],
 * //   not: []
 * // }
 *
 * parseSearchQuery('app\\*test')  // 이스케이프된 *
 * // 결과:
 * // {
 * //   or: ["%app*test%"],  // 리터럴 *
 * //   must: [],
 * //   not: []
 * // }
 * ```
 *
 * @param searchText 검색 쿼리 문자열
 * @returns 파싱된 검색 쿼리 객체 (LIKE 패턴)
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
    .replace(/\\-/g, ESC.MINUS)
    .replace(/\\(.)/g, "$1"); // 미정의 이스케이프: backslash 제거, 리터럴 문자 유지

  // 따옴표 구간 추출
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
      // 따옴표 텍스트는 must로 처리 (정확한 일치 = 필수)
      result.must.push(pattern);
    }
  }

  // 따옴표 구간 제거
  processed = processed.replace(/[+-]?"[^"]*"/g, " ");

  // 공백으로 토큰 분리
  const tokens = processed.split(/\s+/).filter((t) => t.length > 0);

  for (let token of tokens) {
    let targetArray = result.or;

    // + 또는 - 접두사 처리
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
 * 검색어를 SQL LIKE 패턴으로 변환 (내부 함수)
 *
 * 와일드카드 규칙:
 * - `apple` (와일드카드 없음) → `%apple%` (부분 문자열 검색, 기본값)
 * - `apple*` → `apple%` (시작 일치)
 * - `*apple` → `%apple` (끝 일치)
 * - `*apple*` → `%apple%` (명시적 부분 문자열)
 * - `a*ple` → `a%ple` (중간 일치)
 */
function termToLikePattern(term: string): string {
  // 와일드카드 *를 임시 마커로 변환 (이스케이프된 것은 이미 ESC.ASTERISK로 처리됨)
  const WILDCARD = "\x01WILDCARD\x01";
  const hasWildcard = term.includes("*");
  let pattern = term.replace(/\*/g, WILDCARD);

  // SQL LIKE 특수 문자 이스케이프 (\ → \\, % → \%, _ → \_, [ → \[)
  pattern = pattern
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\[/g, "\\[");

  // 와일드카드 마커 → % (SQL 와일드카드)로 변환
  pattern = pattern.replaceAll(WILDCARD, "%");

  // 이스케이프 플레이스홀더 복원
  pattern = pattern
    .replaceAll(ESC.BACKSLASH, "\\\\") // \\ → SQL \\
    .replaceAll(ESC.ASTERISK, "*") // \* → literal * (not special in SQL)
    .replaceAll(ESC.PERCENT, "\\%") // \% → SQL \%
    .replaceAll(ESC.QUOTE, '"')
    .replaceAll(ESC.PLUS, "+")
    .replaceAll(ESC.MINUS, "-");

  // 와일드카드가 없으면 양쪽에 % 추가 (기본 부분 문자열 검색)
  // 와일드카드가 있으면 사용자가 지정한 패턴 그대로 사용
  if (hasWildcard) {
    return pattern;
  }

  return `%${pattern}%`;
}

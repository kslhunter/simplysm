/**
 * 템플릿 문자열 태그 함수들
 * IDE 코드 하이라이팅 지원용 (실제 동작은 문자열 조합 + 들여쓰기 정리)
 */

/** JavaScript 코드 하이라이팅 */
export function js(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/** TypeScript 코드 하이라이팅 */
export function ts(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/** HTML 마크업 하이라이팅 */
export function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/** MSSQL T-SQL 하이라이팅 */
export function tsql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/** MySQL SQL 하이라이팅 */
export function mysql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

/** PostgreSQL SQL 하이라이팅 */
export function pgsql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return _combine(strings, values);
}

function _combine(strings: TemplateStringsArray, values: unknown[]): string {
  const raw = strings.reduce((result, str, i) => {
    const value = values[i] !== undefined ? String(values[i]) : "";
    return result + str + value;
  }, "");
  return _trimIndent(raw);
}

function _trimIndent(text: string): string {
  const lines = text.split("\n");

  // 첫/마지막 빈 줄 제거 (연속된 빈 줄 모두 제거)
  while (lines.length > 0 && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  // 최소 들여쓰기 계산
  const minIndent = lines
    .filter((line) => line.trim() !== "")
    .reduce((min, line) => {
      const indent = line.match(/^ */)?.[0].length ?? 0;
      return Math.min(min, indent);
    }, Infinity);

  // 들여쓰기 제거
  return lines.map((line) => (line.trim() === "" ? "" : line.slice(minIndent))).join("\n");
}

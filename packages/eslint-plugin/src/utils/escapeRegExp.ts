/**
 * 정규표현식 특수문자를 이스케이프합니다.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

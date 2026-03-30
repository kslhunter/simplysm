/**
 * unknown 타입 에러에서 메시지를 추출하는 유틸리티.
 *
 * Error 인스턴스이면 message 속성을 반환하고, 그렇지 않으면 String 변환 결과를 반환.
 *
 * @param err - catch 블록의 unknown 에러
 * @returns 에러 메시지 문자열
 */
export function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * unknown 타입의 에러에서 메시지를 추출하는 유틸리티.
 *
 * Error 인스턴스이면 message 속성을, 아니면 String 변환을 반환한다.
 *
 * @param err - catch 블록의 unknown 에러
 * @returns 에러 메시지 문자열
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

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

/**
 * unknown 타입 에러에서 스택 문자열을 추출한다.
 *
 * Error 인스턴스이면 stack을 우선 반환하고, stack이 없으면 message를 반환한다.
 * Error가 아니면 String 변환 결과를 반환한다.
 *
 * @param err - catch 블록의 unknown 에러
 * @returns 에러 스택 또는 메시지 문자열
 */
export function stack(err: unknown): string {
  return err instanceof Error ? (err.stack ?? err.message) : String(err);
}

/**
 * Error 속성을 담은 plain object 를 Error 인스턴스로 복원한다.
 *
 * 직렬화된 에러(JSON 역직렬화, RPC 전송 등)를 Error 로 되살릴 때 사용한다.
 * `message` 로 Error 를 만든 뒤 나머지 속성(name, stack, code 등)을 그대로 복사한다.
 *
 * @param obj - message, name, stack 등 Error 속성을 담은 객체
 * @returns 복원된 Error 인스턴스
 */
export function fromObject(obj: Record<string, unknown>): Error {
  const error = new Error(obj["message"] as string | undefined);
  Object.assign(error, obj);
  return error;
}

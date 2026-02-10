import { SdError } from "./sd-error";
/**
 * 미구현 오류
 *
 * 아직 구현되지 않은 기능을 호출했을 때 발생시키는 에러이다.
 * 추상 메서드 스텁, 향후 구현 예정인 분기 등에 사용한다.
 *
 * @example
 * // 추상 메서드 구현 전
 * class BaseService {
 *   process(): void {
 *     throw new NotImplementedError("서브클래스에서 구현 필요");
 *   }
 * }
 *
 * @example
 * // 향후 구현 예정 분기
 * switch (type) {
 *   case "A": return handleA();
 *   case "B": throw new NotImplementedError(`타입 ${type} 처리`);
 * }
 */
export declare class NotImplementedError extends SdError {
  /**
   * @param message 추가 설명 메시지
   */
  constructor(message?: string);
}
//# sourceMappingURL=not-implemented-error.d.ts.map

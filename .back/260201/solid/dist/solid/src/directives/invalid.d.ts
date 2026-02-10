declare module "solid-js" {
  namespace JSX {
    interface Directives {
      /**
       * 유효성 검증 directive
       * @param accessor 에러 메시지를 반환하는 함수. 빈 문자열이면 valid 상태
       */
      invalid: () => string;
    }
  }
}
/**
 * 유효성 검증 directive
 *
 * 요소에 유효성 검증 상태를 표시하고, 폼 제출 시 브라우저 기본 동작으로 포커스 이동을 지원한다.
 *
 * @param el - directive가 적용될 HTML 요소
 * @param accessor - 에러 메시지를 반환하는 accessor. 빈 문자열이면 valid 상태
 *
 * @example
 * ```tsx
 * const [name, setName] = createSignal("");
 * const errorMessage = () => name().length === 0 ? "이름을 입력하세요" : "";
 *
 * <div use:invalid={errorMessage}>
 *   <TextField value={name()} onChange={setName} />
 * </div>
 * ```
 *
 * @example
 * ```tsx
 * // 폼과 함께 사용
 * <form onSubmit={handleSubmit}>
 *   <div use:invalid={errorMessage}>
 *     <TextField value={name()} onChange={setName} />
 *   </div>
 *   <button type="submit">제출</button>
 * </form>
 * // invalid 상태에서 제출 시 자동으로 해당 필드로 포커스 이동
 * ```
 */
export declare const invalid: (el: HTMLElement, accessor: () => () => string) => void;
export default invalid;
//# sourceMappingURL=invalid.d.ts.map

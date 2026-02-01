/**
 * ripple 디렉티브 옵션
 */
export interface RippleOptions {
    /**
     * ripple 효과 활성화 여부 (기본값: true)
     */
    enabled?: boolean;
    /**
     * 이벤트 전파를 중단할지 여부 (기본값: false)
     * true로 설정하면 부모 요소의 ripple 효과를 방지할 수 있다
     */
    stopPropagation?: boolean;
}
declare module "solid-js" {
    namespace JSX {
        interface Directives {
            ripple: boolean | RippleOptions;
        }
    }
}
/**
 * Material Design 스타일의 ripple 효과를 적용하는 디렉티브
 *
 * 클릭 시 클릭 위치에서 원형으로 퍼지는 시각적 피드백을 제공한다.
 * 요소의 position이 static인 경우 relative로 변경하고, overflow를 hidden으로 설정한다.
 *
 * @param el - ripple 효과를 적용할 HTML 요소
 * @param value - ripple 활성화 여부를 반환하는 accessor 또는 옵션 객체
 *
 * @example
 * ```tsx
 * // 기본 사용
 * <button use:ripple>클릭</button>
 *
 * // 조건부 활성화
 * <button use:ripple={!disabled()}>클릭</button>
 *
 * // 옵션 사용 (부모 ripple 방지)
 * <button use:ripple={{ enabled: true, stopPropagation: true }}>클릭</button>
 * ```
 */
export declare const ripple: (el: HTMLElement, value?: () => boolean | RippleOptions) => void;
//# sourceMappingURL=ripple.d.ts.map
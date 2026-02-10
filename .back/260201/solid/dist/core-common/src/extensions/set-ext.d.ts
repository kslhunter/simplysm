/**
 * Set 확장 메서드
 */
declare global {
  interface Set<T> {
    /**
     * 여러 값을 한 번에 추가
     */
    adds(...values: T[]): this;
    /**
     * 값을 토글한다 (있으면 제거, 없으면 추가)
     *
     * @param value 토글할 값
     * @param addOrDel 강제로 추가("add") 또는 제거("del") 지정 (생략 시 자동 토글)
     * @returns this (메서드 체이닝 가능)
     *
     * @remarks
     * addOrDel 파라미터로 조건부 추가/제거를 간결하게 표현할 수 있다.
     *
     * @example
     * ```typescript
     * const set = new Set<number>([1, 2, 3]);
     *
     * set.toggle(2);  // 2가 있으므로 제거 → {1, 3}
     * set.toggle(4);  // 4가 없으므로 추가 → {1, 3, 4}
     *
     * // 조건부 토글
     * const isAdmin = true;
     * set.toggle(5, isAdmin ? "add" : "del");  // 강제 추가
     * ```
     */
    toggle(value: T, addOrDel?: "add" | "del"): this;
  }
}
export {};
//# sourceMappingURL=set-ext.d.ts.map

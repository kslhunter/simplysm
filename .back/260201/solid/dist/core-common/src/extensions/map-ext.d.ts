/**
 * Map 확장 메서드
 */
declare global {
    interface Map<K, V> {
        /**
         * 키에 해당하는 값이 없으면 새 값을 설정하고 반환
         *
         * @remarks
         * **주의**: V 타입이 함수인 경우(예: `Map<string, () => void>`),
         * 두 번째 인자로 함수를 직접 전달하면 팩토리로 인식되어 호출됩니다.
         * 함수 자체를 값으로 저장하려면 팩토리로 감싸세요.
         *
         * @example
         * ```typescript
         * // 일반 값
         * map.getOrCreate("key", 0);
         * map.getOrCreate("key", []);
         *
         * // 팩토리 함수 (계산 비용이 큰 경우)
         * map.getOrCreate("key", () => expensiveComputation());
         *
         * // 함수를 값으로 저장하는 경우
         * const fnMap = new Map<string, () => void>();
         * const myFn = () => console.log("hello");
         * fnMap.getOrCreate("key", () => myFn);  // 팩토리로 감싸기
         * ```
         */
        getOrCreate(key: K, newValue: V): V;
        getOrCreate(key: K, newValueFn: () => V): V;
        /**
         * 키에 해당하는 값을 함수로 업데이트한다
         *
         * @param key 업데이트할 키
         * @param updateFn 현재 값을 받아 새 값을 반환하는 함수 (키가 없으면 undefined 전달)
         *
         * @remarks
         * 키가 존재하지 않아도 updateFn이 호출되어 새 값이 설정된다.
         * 기존 값 기반 계산이 필요한 경우 (카운터 증가, 배열에 추가 등) 유용하다.
         *
         * @example
         * ```typescript
         * const countMap = new Map<string, number>();
         *
         * // 카운터 증가
         * countMap.update("key", (v) => (v ?? 0) + 1);
         *
         * // 배열에 항목 추가
         * const arrayMap = new Map<string, string[]>();
         * arrayMap.update("key", (v) => [...(v ?? []), "item"]);
         * ```
         */
        update(key: K, updateFn: (v: V | undefined) => V): void;
    }
}
export {};
//# sourceMappingURL=map-ext.d.ts.map
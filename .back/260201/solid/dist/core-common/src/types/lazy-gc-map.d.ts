/**
 * 자동 만료 기능이 있는 Map
 * LRU 방식으로 접근 시간 갱신, 일정 시간 미접근 시 자동 삭제
 *
 * @note 인스턴스 사용 후 반드시 dispose()를 호출하거나 using 문을 사용해야 함.
 *       그렇지 않으면 GC 타이머가 계속 동작하여 메모리 누수 발생.
 *
 * @example
 * // using 문 사용 (권장)
 * using map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 });
 *
 * // 또는 명시적 dispose() 호출
 * const map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 });
 * try {
 *   // ... 사용
 * } finally {
 *   map.dispose();
 * }
 */
export declare class LazyGcMap<K, V> {
    private readonly _options;
    private static readonly _logger;
    /**
     * dispose() 미호출 감지용 registry
     * @note FinalizationRegistry는 Chrome 84+, Node 14.6+ 지원
     *       미지원 환경에서는 경고 없이 동작하지만, dispose() 미호출 시 메모리 누수 가능
     */
    private static readonly _registry;
    private readonly _map;
    private _gcTimer?;
    private _isGcRunning;
    private _isDestroyed;
    private readonly _instanceId;
    /**
     * @param _options 설정 옵션
     * @param _options.gcInterval GC 주기 (밀리초). 예: 10000 (10초)
     * @param _options.expireTime 만료 시간 (밀리초). 마지막 접근 후 이 시간이 지나면 삭제됨. 예: 60000 (60초)
     * @param _options.onExpire 만료 시 호출되는 콜백. 비동기 함수도 가능하며, 에러 발생 시 로깅 후 계속 진행됨
     */
    constructor(_options: {
        gcInterval: number;
        expireTime: number;
        onExpire?: (key: K, value: V) => void | Promise<void>;
    });
    /** 저장된 항목 수 */
    get size(): number;
    /** 키 존재 여부 확인 (접근 시간 갱신 안함) */
    has(key: K): boolean;
    /** 값 조회 (접근 시간 갱신됨) */
    get(key: K): V | undefined;
    /** 값 저장 (접근 시간 설정 및 GC 타이머 시작) */
    set(key: K, value: V): void;
    /** 항목 삭제 (비었으면 GC 타이머 중지) */
    delete(key: K): boolean;
    /** 인스턴스 정리 (GC 타이머 중지 및 데이터 삭제) */
    dispose(): void;
    /** using 문 지원 */
    [Symbol.dispose](): void;
    /**
     * 모든 항목 삭제 (인스턴스는 계속 사용 가능)
     */
    clear(): void;
    /**
     * 키에 해당하는 값을 반환하고, 없으면 factory로 생성 후 저장하여 반환
     * @param key 조회할 키
     * @param factory 키가 없을 때 값을 생성하는 함수
     * @returns 기존 값 또는 새로 생성된 값
     */
    getOrCreate(key: K, factory: () => V): V;
    /** 값들만 순회 (Iterator) */
    values(): IterableIterator<V>;
    /** 키들만 순회 (Iterator) */
    keys(): IterableIterator<K>;
    /** 엔트리 순회 (Iterator) */
    entries(): IterableIterator<[K, V]>;
    private _startGc;
    private _runGc;
    private _stopGc;
}
//# sourceMappingURL=lazy-gc-map.d.ts.map
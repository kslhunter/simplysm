import consola from "consola";

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
export class LazyGcMap<TKey, TValue> {
  private static readonly _logger = consola.withTag("LazyGcMap");

  // 실제 데이터와 마지막 접근 시간을 함께 저장
  private readonly _map = new Map<TKey, { value: TValue; lastAccess: number }>();

  // GC 타이머
  private _gcTimer?: ReturnType<typeof setInterval>;
  // GC 실행 중 플래그 (중복 실행 방지)
  private _isGcRunning = false;
  // destroy 호출 여부
  private _isDestroyed = false;

  /**
   * @param _options 설정 옵션
   * @param _options.gcInterval GC 주기 (밀리초). 기본값: expireTime의 1/10 (최소 1000ms)
   * @param _options.expireTime 만료 시간 (밀리초). 마지막 접근 후 이 시간이 지나면 삭제됨. 예: 60000 (60초)
   * @param _options.onExpire 만료 시 호출되는 콜백. 비동기 함수도 가능하며, 에러 발생 시 로깅 후 계속 진행됨
   */
  constructor(
    private readonly _options: {
      gcInterval?: number;
      expireTime: number;
      onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
    },
  ) {}

  /** 저장된 항목 수 */
  get size(): number {
    return this._map.size;
  }

  /** 키 존재 여부 확인 (접근 시간 갱신 안함) */
  has(key: TKey): boolean {
    if (this._isDestroyed) return false;
    return this._map.has(key);
  }

  /** 값 조회 (접근 시간 갱신됨) */
  get(key: TKey): TValue | undefined {
    if (this._isDestroyed) return undefined;
    const item = this._map.get(key);
    if (item == null) return undefined;

    // 접근 시 시간 갱신 (LRU)
    item.lastAccess = Date.now();
    return item.value;
  }

  /** 값 저장 (접근 시간 설정 및 GC 타이머 시작) */
  set(key: TKey, value: TValue): void {
    if (this._isDestroyed) return;
    this._map.set(key, { value, lastAccess: Date.now() });
    // 데이터가 들어왔으므로 GC 타이머 가동
    this._startGc();
  }

  /** 항목 삭제 (비었으면 GC 타이머 중지) */
  delete(key: TKey): boolean {
    if (this._isDestroyed) return false;
    const result = this._map.delete(key);
    // 비었으면 타이머 중지
    if (this._map.size === 0) {
      this._stopGc();
    }
    return result;
  }

  /** 인스턴스 정리 (GC 타이머 중지 및 데이터 삭제) */
  dispose(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._map.clear();
    this._stopGc();
  }

  /** using 문 지원 */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * 모든 항목 삭제 (인스턴스는 계속 사용 가능)
   */
  clear(): void {
    if (this._isDestroyed) return;
    this._map.clear();
    this._stopGc();
  }

  /**
   * 키에 해당하는 값을 반환하고, 없으면 factory로 생성 후 저장하여 반환
   * @param key 조회할 키
   * @param factory 키가 없을 때 값을 생성하는 함수
   * @returns 기존 값 또는 새로 생성된 값
   */
  getOrCreate(key: TKey, factory: () => TValue): TValue {
    if (this._isDestroyed) {
      throw new Error("LazyGcMap이 이미 dispose되었습니다.");
    }
    const item = this._map.get(key);
    if (item == null) {
      const value = factory();
      this.set(key, value);
      return value;
    }

    item.lastAccess = Date.now();
    return item.value;
  }

  /** 값들만 순회 (Iterator) */
  *values(): IterableIterator<TValue> {
    if (this._isDestroyed) return;
    for (const item of this._map.values()) {
      yield item.value;
    }
  }

  /** 키들만 순회 (Iterator) */
  *keys(): IterableIterator<TKey> {
    if (this._isDestroyed) return;
    yield* this._map.keys();
  }

  /** 엔트리 순회 (Iterator) */
  *entries(): IterableIterator<[TKey, TValue]> {
    if (this._isDestroyed) return;
    for (const [key, item] of this._map.entries()) {
      yield [key, item.value];
    }
  }

  //#region GC 로직

  private _startGc(): void {
    if (this._isDestroyed) return;
    if (this._gcTimer != null) return;

    const interval = this._options.gcInterval ?? Math.max(this._options.expireTime / 10, 1000);
    this._gcTimer = setInterval(() => {
      void this._runGc();
    }, interval);
  }

  private async _runGc(): Promise<void> {
    // 이미 실행 중이면 스킵 (onExpire 콜백이 오래 걸리는 경우 중복 실행 방지)
    if (this._isGcRunning) return;
    this._isGcRunning = true;

    try {
      const now = Date.now();

      // 1. 만료된 항목 수집 (삭제 전)
      const expiredEntries: { key: TKey; item: { value: TValue; lastAccess: number } }[] = [];
      for (const [key, item] of this._map) {
        if (now - item.lastAccess > this._options.expireTime) {
          expiredEntries.push({ key, item });
        }
      }

      // 2. 각 항목에 대해 콜백 실행 후 삭제
      for (const { key, item } of expiredEntries) {
        // 콜백 실행 전 현재 상태 확인 (이미 다른 값으로 교체되었거나 삭제되었으면 스킵)
        const currentItem = this._map.get(key);
        if (currentItem !== item) {
          continue;
        }

        // 만료 콜백 실행
        if (this._options.onExpire != null) {
          try {
            await this._options.onExpire(key, item.value);
          } catch (err) {
            LazyGcMap._logger.error("onExpire 콜백 에러", err);
          }
        }

        // 콜백 후 재등록 여부 확인
        // 시나리오: onExpire 콜백에서 동일 키로 새 값을 set()한 경우,
        // 새로 등록된 항목을 삭제하면 안 됨. item 참조가 같으면 재등록되지 않은 것이므로 삭제 진행.
        const afterItem = this._map.get(key);
        if (afterItem === item) {
          this._map.delete(key);
        }
      }

      // GC 후 비었으면 끄기
      if (this._map.size === 0) {
        this._stopGc();
      }
    } finally {
      this._isGcRunning = false;
    }
  }

  private _stopGc(): void {
    if (this._gcTimer != null) {
      clearInterval(this._gcTimer);
      this._gcTimer = undefined;
    }
  }

  //#endregion
}

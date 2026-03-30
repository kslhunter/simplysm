import consola from "consola";

/**
 * 자동 만료 기능이 있는 Map
 * LRU 방식으로 접근 시간을 갱신하고, 지정된 시간 동안 접근하지 않으면 자동 삭제
 *
 * @note 사용 후 반드시 dispose()를 호출하거나 'using' 문을 사용해야 함.
 *       그렇지 않으면 GC 타이머가 계속 실행되어 메모리 누수 발생.
 *
 * @example
 * // using 문 (권장)
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
  // 중복 GC 실행 방지 플래그
  private _isGcRunning = false;
  // dispose()가 호출되었는지 여부
  private _isDestroyed = false;

  /**
   * @param _options 설정 옵션
   * @param _options.gcInterval GC 간격 (밀리초). 기본값: expireTime의 1/10 (최소 1000ms)
   * @param _options.expireTime 만료 시간 (밀리초). 마지막 접근 이후 이 시간이 지나면 삭제됨. 예: 60000 (60초)
   * @param _options.onExpire 만료 시 호출되는 콜백. 비동기 함수 가능, 에러 발생 시 로그 출력 후 계속 실행
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

  /** key 존재 여부 확인 (접근 시간 갱신하지 않음) */
  has(key: TKey): boolean {
    if (this._isDestroyed) return false;
    return this._map.has(key);
  }

  /** 값 조회 (접근 시간 갱신) */
  get(key: TKey): TValue | undefined {
    if (this._isDestroyed) return undefined;
    const item = this._map.get(key);
    if (item == null) return undefined;

    // 조회 시 접근 시간 갱신 (LRU)
    item.lastAccess = Date.now();
    return item.value;
  }

  /** 값 저장 (접근 시간 설정 및 GC 타이머 시작) */
  set(key: TKey, value: TValue): void {
    if (this._isDestroyed) return;
    this._map.set(key, { value, lastAccess: Date.now() });
    // 데이터 추가 시 GC 타이머 시작
    this._startGc();
  }

  /** 항목 삭제 (비어있으면 GC 타이머 중지) */
  delete(key: TKey): boolean {
    if (this._isDestroyed) return false;
    const result = this._map.delete(key);
    // 비어있으면 타이머 중지
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

  /** 'using' 문 지원 */
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
   * key에 대한 값을 반환하거나, 없으면 팩토리로 생성하여 저장 후 반환
   * @param key 조회할 key
   * @param factory key가 없을 때 값을 생성하는 함수
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

  /** 값만 순회 (Iterator) */
  *values(): IterableIterator<TValue> {
    if (this._isDestroyed) return;
    for (const item of this._map.values()) {
      yield item.value;
    }
  }

  /** key만 순회 (Iterator) */
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

  //#region GC logic

  private _startGc(): void {
    if (this._isDestroyed) return;
    if (this._gcTimer != null) return;

    const interval = this._options.gcInterval ?? Math.max(this._options.expireTime / 10, 1000);
    this._gcTimer = setInterval(() => {
      void this._runGc();
    }, interval);
  }

  private async _runGc(): Promise<void> {
    // 이미 실행 중이면 건너뜀 (onExpire 콜백이 오래 걸릴 때 중복 실행 방지)
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
        // 콜백 전 현재 상태 확인 (이미 교체되었거나 삭제된 경우 건너뜀)
        const currentItem = this._map.get(key);
        if (currentItem !== item) {
          continue;
        }

        // 만료 콜백 실행
        if (this._options.onExpire != null) {
          try {
            await this._options.onExpire(key, item.value);
          } catch (err) {
            LazyGcMap._logger.error("onExpire 콜백 오류", err);
          }
        }

        // 콜백 후 항목이 다시 등록되었는지 확인
        // 시나리오: onExpire 콜백이 같은 key로 set()을 호출하면,
        // 새로 등록된 항목을 삭제하면 안 됨. 항목 참조가 같으면 재등록되지 않은 것이므로 삭제.
        const afterItem = this._map.get(key);
        if (afterItem === item) {
          this._map.delete(key);
        }
      }

      // 정리 후 비어있으면 GC 중지
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

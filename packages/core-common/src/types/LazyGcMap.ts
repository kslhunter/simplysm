/**
 * 자동 만료 기능이 있는 Map
 * LRU 방식으로 접근 시간 갱신, 일정 시간 미접근 시 자동 삭제
 */
export class LazyGcMap<K, V> {
  // 실제 데이터와 마지막 접근 시간을 함께 저장
  private readonly _map = new Map<K, { value: V; lastAccess: number }>();

  // GC 타이머
  private _gcTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly _options: {
      gcInterval: number; // GC 주기 (예: 10초)
      expireTime: number; // 만료 시간 (예: 60초)
      onExpire?: (key: K, value: V) => void | Promise<void>; // 만료 시 콜백
    },
  ) {}

  get size(): number {
    return this._map.size;
  }

  has(key: K): boolean {
    return this._map.has(key);
  }

  get(key: K): V | undefined {
    const item = this._map.get(key);
    if (item == null) return undefined;

    // 접근 시 시간 갱신 (LRU)
    item.lastAccess = Date.now();
    return item.value;
  }

  set(key: K, value: V): void {
    this._map.set(key, { value, lastAccess: Date.now() });
    // 데이터가 들어왔으므로 GC 타이머 가동
    this._startGc();
  }

  delete(key: K): boolean {
    const result = this._map.delete(key);
    // 비었으면 타이머 중지
    if (this._map.size === 0) {
      this._stopGc();
    }
    return result;
  }

  clear(): void {
    this._map.clear();
    this._stopGc();
  }

  // 편의 메소드: 없으면 만들어서 넣고 반환
  getOrCreate(key: K, factory: () => V): V {
    const item = this._map.get(key);
    if (item == null) {
      const value = factory();
      this.set(key, value);
      return value;
    }

    item.lastAccess = Date.now();
    return item.value;
  }

  // 값들만 순회 (Iterator)
  *values(): IterableIterator<V> {
    for (const item of this._map.values()) {
      yield item.value;
    }
  }

  // 키들만 순회 (Iterator)
  *keys(): IterableIterator<K> {
    yield* this._map.keys();
  }

  // 엔트리 순회 (Iterator)
  *entries(): IterableIterator<[K, V]> {
    for (const [key, item] of this._map.entries()) {
      yield [key, item.value];
    }
  }

  //#region GC 로직

  private _startGc(): void {
    if (this._gcTimer != null) return;

    this._gcTimer = setInterval(() => {
      void this._runGc();
    }, this._options.gcInterval);
  }

  private async _runGc(): Promise<void> {
    const now = Date.now();

    for (const [key, item] of this._map) {
      if (now - item.lastAccess > this._options.expireTime) {
        // 1. 맵에서 제거
        this._map.delete(key);

        // 2. 만료 콜백 실행
        if (this._options.onExpire != null) {
          try {
            await this._options.onExpire(key, item.value);
          } catch {
            // 만료 콜백 에러 무시
          }
        }
      }
    }

    // GC 후 비었으면 끄기
    if (this._map.size === 0) {
      this._stopGc();
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

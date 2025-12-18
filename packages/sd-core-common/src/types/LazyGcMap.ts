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
    if (!item) return undefined;

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
    let item = this._map.get(key);
    if (!item) {
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

  // [GC 로직]
  private _startGc() {
    if (this._gcTimer != null) return;

    this._gcTimer = setInterval(async () => {
      const now = Date.now();

      for (const [key, item] of this._map) {
        if (now - item.lastAccess > this._options.expireTime) {
          // 1. 맵에서 제거
          this._map.delete(key);

          // 2. 만료 콜백 실행 (비동기 에러 무시)
          if (this._options.onExpire) {
            try {
              await this._options.onExpire(key, item.value);
            } catch {}
          }
        }
      }

      // GC 후 비었으면 끄기
      if (this._map.size === 0) {
        this._stopGc();
      }
    }, this._options.gcInterval);
  }

  private _stopGc() {
    if (this._gcTimer != null) {
      clearInterval(this._gcTimer);
      this._gcTimer = undefined;
    }
  }
}

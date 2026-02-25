import consola from "consola";

/**
 * Map with automatic expiration feature
 * Updates access time in LRU manner, auto-deletes if not accessed for specified time
 *
 * @note Must call dispose() or use 'using' statement after use.
 *       Otherwise GC timer continues running and causes memory leak.
 *
 * @example
 * // using statement (recommended)
 * using map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 });
 *
 * // Or explicit dispose() call
 * const map = new LazyGcMap({ gcInterval: 10000, expireTime: 60000 });
 * try {
 *   // ... usage
 * } finally {
 *   map.dispose();
 * }
 */
export class LazyGcMap<TKey, TValue> {
  private static readonly _logger = consola.withTag("LazyGcMap");

  // Store actual data and last access time together
  private readonly _map = new Map<TKey, { value: TValue; lastAccess: number }>();

  // GC timer
  private _gcTimer?: ReturnType<typeof setInterval>;
  // Flag to prevent duplicate GC runs
  private _isGcRunning = false;
  // Whether dispose() has been called
  private _isDestroyed = false;

  /**
   * @param _options Configuration options
   * @param _options.gcInterval GC interval in milliseconds. Default: 1/10 of expireTime (minimum 1000ms)
   * @param _options.expireTime Expiration time in milliseconds. Deleted after this time since last access. Example: 60000 (60 seconds)
   * @param _options.onExpire Callback called on expiration. Can be async function, errors are logged and continue execution
   */
  constructor(
    private readonly _options: {
      gcInterval?: number;
      expireTime: number;
      onExpire?: (key: TKey, value: TValue) => void | Promise<void>;
    },
  ) {}

  /** Number of stored items */
  get size(): number {
    return this._map.size;
  }

  /** Check if key exists (does not update access time) */
  has(key: TKey): boolean {
    if (this._isDestroyed) return false;
    return this._map.has(key);
  }

  /** Get value (updates access time) */
  get(key: TKey): TValue | undefined {
    if (this._isDestroyed) return undefined;
    const item = this._map.get(key);
    if (item == null) return undefined;

    // Update access time on retrieval (LRU)
    item.lastAccess = Date.now();
    return item.value;
  }

  /** Store value (sets access time and starts GC timer) */
  set(key: TKey, value: TValue): void {
    if (this._isDestroyed) return;
    this._map.set(key, { value, lastAccess: Date.now() });
    // Start GC timer when data is added
    this._startGc();
  }

  /** Delete item (stops GC timer if empty) */
  delete(key: TKey): boolean {
    if (this._isDestroyed) return false;
    const result = this._map.delete(key);
    // Stop timer if empty
    if (this._map.size === 0) {
      this._stopGc();
    }
    return result;
  }

  /** Clean up instance (stop GC timer and delete data) */
  dispose(): void {
    if (this._isDestroyed) return;
    this._isDestroyed = true;
    this._map.clear();
    this._stopGc();
  }

  /** Support for 'using' statement */
  [Symbol.dispose](): void {
    this.dispose();
  }

  /**
   * Delete all items (instance can still be used)
   */
  clear(): void {
    if (this._isDestroyed) return;
    this._map.clear();
    this._stopGc();
  }

  /**
   * Return value for key, or create and store via factory if not found
   * @param key Key to look up
   * @param factory Function to create value if key not found
   * @returns Existing or newly created value
   */
  getOrCreate(key: TKey, factory: () => TValue): TValue {
    if (this._isDestroyed) {
      throw new Error("LazyGcMap has already been disposed.");
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

  /** Iterate over values only (Iterator) */
  *values(): IterableIterator<TValue> {
    if (this._isDestroyed) return;
    for (const item of this._map.values()) {
      yield item.value;
    }
  }

  /** Iterate over keys only (Iterator) */
  *keys(): IterableIterator<TKey> {
    if (this._isDestroyed) return;
    yield* this._map.keys();
  }

  /** Iterate over entries (Iterator) */
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
    // Skip if already running (prevent duplicate runs when onExpire callback takes time)
    if (this._isGcRunning) return;
    this._isGcRunning = true;

    try {
      const now = Date.now();

      // 1. Collect expired items (before deletion)
      const expiredEntries: { key: TKey; item: { value: TValue; lastAccess: number } }[] = [];
      for (const [key, item] of this._map) {
        if (now - item.lastAccess > this._options.expireTime) {
          expiredEntries.push({ key, item });
        }
      }

      // 2. Run callback then delete each item
      for (const { key, item } of expiredEntries) {
        // Check current state before callback (skip if already replaced or deleted)
        const currentItem = this._map.get(key);
        if (currentItem !== item) {
          continue;
        }

        // Run expiration callback
        if (this._options.onExpire != null) {
          try {
            await this._options.onExpire(key, item.value);
          } catch (err) {
            LazyGcMap._logger.error("onExpire callback error", err);
          }
        }

        // Check if item was re-registered after callback
        // Scenario: onExpire callback calls set() with same key,
        // we should not delete newly registered item. If item reference is same, not re-registered, so delete.
        const afterItem = this._map.get(key);
        if (afterItem === item) {
          this._map.delete(key);
        }
      }

      // Stop GC if empty after cleanup
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

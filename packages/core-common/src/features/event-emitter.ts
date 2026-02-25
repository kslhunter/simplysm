/**
 * EventTarget wrapper - provides EventEmitter-like API
 *
 * A type-safe event emitter that can be used in both browsers and Node.js.
 * Internally implemented using EventTarget.
 *
 * @typeParam TEvents Event type map. Keys are event names, values are event data types
 *
 * @example
 * interface MyEvents {
 *   data: string;
 *   error: Error;
 *   done: void;
 * }
 *
 * class MyEmitter extends EventEmitter<MyEvents> {}
 *
 * const emitter = new MyEmitter();
 * emitter.on("data", (data) => console.log(data)); // data: string
 * emitter.emit("data", "hello");
 * emitter.emit("done"); // void type is called without arguments
 */
export class EventEmitter<
  TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>,
> {
  private readonly _target = new EventTarget();
  // Manage listener maps by event type (same listener can be registered to different events)
  // Use Function type for polymorphic listener management
  private readonly _listenerMap = new Map<string, Map<Function, (e: Event) => void>>();

  /**
   * Register an event listener
   *
   * @param type Event type
   * @param listener Event handler
   * @note Duplicate registration of the same listener to the same event is ignored
   */
  on<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void {
    // Get or create map for event type
    let typeMap = this._listenerMap.get(type);
    if (!typeMap) {
      typeMap = new Map();
      this._listenerMap.set(type, typeMap);
    }

    // If listener is already registered to this event, ignore it (prevent duplicate registration)
    if (typeMap.has(listener)) return;

    const wrappedListener = (e: Event) => listener((e as CustomEvent).detail);
    typeMap.set(listener, wrappedListener);
    this._target.addEventListener(type, wrappedListener);
  }

  /**
   * Remove an event listener
   *
   * @param type Event type
   * @param listener Event handler to remove
   */
  off<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void {
    const typeMap = this._listenerMap.get(type);
    if (!typeMap) return;

    const wrappedListener = typeMap.get(listener);
    if (wrappedListener) {
      this._target.removeEventListener(type, wrappedListener);
      typeMap.delete(listener);

      // Clean up empty map
      if (typeMap.size === 0) {
        this._listenerMap.delete(type);
      }
    }
  }

  /**
   * Emit an event
   *
   * @param type Event type
   * @param args Event data (omitted if void type)
   */
  emit<K extends keyof TEvents & string>(
    type: K,
    ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]
  ): void {
    this._target.dispatchEvent(new CustomEvent(type, { detail: args[0] }));
  }

  /**
   * Return the number of listeners for a specific event
   *
   * @param type Event type
   * @returns Number of registered listeners
   */
  listenerCount<K extends keyof TEvents & string>(type: K): number {
    return this._listenerMap.get(type)?.size ?? 0;
  }

  /**
   * Remove all event listeners
   */
  dispose(): void {
    for (const [type, typeMap] of this._listenerMap) {
      for (const wrappedListener of typeMap.values()) {
        this._target.removeEventListener(type, wrappedListener);
      }
    }
    this._listenerMap.clear();
  }

  /**
   * Supports using statement
   */
  [Symbol.dispose](): void {
    this.dispose();
  }
}

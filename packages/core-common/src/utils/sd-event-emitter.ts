/**
 * EventTarget 래퍼 - EventEmitter와 유사한 API 제공
 */
export class SdEventEmitter<T extends { [K in keyof T]: unknown } = Record<string, unknown>> {
  private readonly _target = new EventTarget();
  // 이벤트 타입별로 리스너 맵 관리 (같은 리스너를 다른 이벤트에 등록 가능)
  // 다형적 리스너 관리를 위해 Function 타입 사용
  private readonly _listenerMap = new Map<string, Map<Function, (e: Event) => void>>();
  private readonly _listenerCounts = new Map<string, number>();

  constructor() {}

  on<K extends keyof T & string>(type: K, listener: (data: T[K]) => void): void {
    // 이벤트 타입별 맵 가져오거나 생성
    let typeMap = this._listenerMap.get(type);
    if (!typeMap) {
      typeMap = new Map();
      this._listenerMap.set(type, typeMap);
    }

    // 이미 해당 이벤트에 등록된 리스너면 무시 (중복 등록 방지)
    if (typeMap.has(listener)) return;

    this._listenerCounts.set(type, (this._listenerCounts.get(type) ?? 0) + 1);

    const wrappedListener = (e: Event) => listener((e as CustomEvent).detail);
    typeMap.set(listener, wrappedListener);
    this._target.addEventListener(type, wrappedListener);
  }

  off<K extends keyof T & string>(type: K, listener: (data: T[K]) => void): void {
    const typeMap = this._listenerMap.get(type);
    if (!typeMap) return;

    const wrappedListener = typeMap.get(listener);
    if (wrappedListener) {
      const count = this._listenerCounts.get(type) ?? 0;
      if (count > 0) this._listenerCounts.set(type, count - 1);

      this._target.removeEventListener(type, wrappedListener);
      typeMap.delete(listener);

      // 빈 맵 정리
      if (typeMap.size === 0) {
        this._listenerMap.delete(type);
      }
    }
  }

  emit<K extends keyof T & string>(
    type: K,
    ...args: T[K] extends void ? [] : [data: T[K]]
  ): void {
    this._target.dispatchEvent(new CustomEvent(type, { detail: args[0] }));
  }

  listenerCount<K extends keyof T & string>(type: K): number {
    return this._listenerCounts.get(type) ?? 0;
  }
}

/**
 * EventTarget 래퍼 - EventEmitter와 유사한 API 제공
 *
 * 브라우저와 Node.js 모두에서 사용 가능한 타입 안전한 이벤트 에미터이다.
 * 내부적으로 EventTarget을 사용하여 구현되어 있다.
 *
 * @typeParam TEvents 이벤트 타입 맵. 키는 이벤트 이름, 값은 이벤트 데이터 타입
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
 * emitter.emit("done"); // void 타입은 인자 없이 호출
 */
export class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  private readonly _target = new EventTarget();
  // 이벤트 타입별로 리스너 맵 관리 (같은 리스너를 다른 이벤트에 등록 가능)
  // 다형적 리스너 관리를 위해 Function 타입 사용
  private readonly _listenerMap = new Map<string, Map<Function, (e: Event) => void>>();

  /**
   * 이벤트 리스너 등록
   *
   * @param type 이벤트 타입
   * @param listener 이벤트 핸들러
   * @note 같은 리스너를 같은 이벤트에 중복 등록하면 무시됨
   */
  on<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void {
    // 이벤트 타입별 맵 가져오거나 생성
    let typeMap = this._listenerMap.get(type);
    if (!typeMap) {
      typeMap = new Map();
      this._listenerMap.set(type, typeMap);
    }

    // 이미 해당 이벤트에 등록된 리스너면 무시 (중복 등록 방지)
    if (typeMap.has(listener)) return;

    const wrappedListener = (e: Event) => listener((e as CustomEvent).detail);
    typeMap.set(listener, wrappedListener);
    this._target.addEventListener(type, wrappedListener);
  }

  /**
   * 이벤트 리스너 제거
   *
   * @param type 이벤트 타입
   * @param listener 제거할 이벤트 핸들러
   */
  off<K extends keyof TEvents & string>(type: K, listener: (data: TEvents[K]) => void): void {
    const typeMap = this._listenerMap.get(type);
    if (!typeMap) return;

    const wrappedListener = typeMap.get(listener);
    if (wrappedListener) {
      this._target.removeEventListener(type, wrappedListener);
      typeMap.delete(listener);

      // 빈 맵 정리
      if (typeMap.size === 0) {
        this._listenerMap.delete(type);
      }
    }
  }

  /**
   * 이벤트 발생
   *
   * @param type 이벤트 타입
   * @param args 이벤트 데이터 (void 타입이면 생략)
   */
  emit<K extends keyof TEvents & string>(type: K, ...args: TEvents[K] extends void ? [] : [data: TEvents[K]]): void {
    this._target.dispatchEvent(new CustomEvent(type, { detail: args[0] }));
  }

  /**
   * 특정 이벤트의 리스너 수 반환
   *
   * @param type 이벤트 타입
   * @returns 등록된 리스너 수
   */
  listenerCount<K extends keyof TEvents & string>(type: K): number {
    return this._listenerMap.get(type)?.size ?? 0;
  }

  /**
   * 모든 이벤트 리스너를 제거한다.
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
   * using 문 지원
   */
  [Symbol.dispose](): void {
    this.dispose();
  }
}

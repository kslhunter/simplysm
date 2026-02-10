/**
 * EventTarget 래퍼 - EventEmitter와 유사한 API 제공
 *
 * 브라우저와 Node.js 모두에서 사용 가능한 타입 안전한 이벤트 에미터이다.
 * 내부적으로 EventTarget을 사용하여 구현되어 있다.
 *
 * @typeParam T 이벤트 타입 맵. 키는 이벤트 이름, 값은 이벤트 데이터 타입
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
export declare class EventEmitter<
  T extends {
    [K in keyof T]: unknown;
  } = Record<string, unknown>,
> {
  private readonly _target;
  private readonly _listenerMap;
  /**
   * 이벤트 리스너 등록
   *
   * @param type 이벤트 타입
   * @param listener 이벤트 핸들러
   * @note 같은 리스너를 같은 이벤트에 중복 등록하면 무시됨
   */
  on<K extends keyof T & string>(type: K, listener: (data: T[K]) => void): void;
  /**
   * 이벤트 리스너 제거
   *
   * @param type 이벤트 타입
   * @param listener 제거할 이벤트 핸들러
   */
  off<K extends keyof T & string>(type: K, listener: (data: T[K]) => void): void;
  /**
   * 이벤트 발생
   *
   * @param type 이벤트 타입
   * @param args 이벤트 데이터 (void 타입이면 생략)
   */
  emit<K extends keyof T & string>(type: K, ...args: T[K] extends void ? [] : [data: T[K]]): void;
  /**
   * 특정 이벤트의 리스너 수 반환
   *
   * @param type 이벤트 타입
   * @returns 등록된 리스너 수
   */
  listenerCount<K extends keyof T & string>(type: K): number;
  /**
   * 모든 이벤트 리스너를 제거한다.
   */
  dispose(): void;
  /**
   * using 문 지원
   */
  [Symbol.dispose](): void;
}
//# sourceMappingURL=event-emitter.d.ts.map

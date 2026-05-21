# @simplysm/core-common — features

## EventEmitter<TEvents>

EventTarget 기반의 타입 안전 이벤트 이미터. 브라우저·Node 공통.

```ts
class EventEmitter<TEvents extends { [K in keyof TEvents]: unknown } = Record<string, unknown>> {
  on<E extends keyof TEvents & string>(type: E, listener: (data: TEvents[E]) => void): void
  off<E>(type: E, listener: ...): void
  emit<E>(type: E, ...args: TEvents[E] extends void ? [] : [data: TEvents[E]]): void
  listenerCount(type): number
  dispose(): void                            // 모든 리스너 제거
}
```
- `TEvents`: `{ eventName: dataType }` 맵. `void` 타입이면 `emit("done")` 인자 생략.
- 같은 `(type, listener)` 쌍 중복 등록 시 무시.
- 내부적으로 `CustomEvent.detail`로 데이터 전송. listener는 wrapper로 감싸져 등록되며, listenerMap이 원본 ↔ wrapper 매핑 보관.

```ts
interface MyEvents { data: string; done: void }
class M extends EventEmitter<MyEvents> {}
const m = new M();
m.on("data", s => ...);
m.emit("data", "hi");
m.emit("done");
```

## DebounceQueue extends EventEmitter<{ error: SdError }>

마지막 요청만 실행. 짧은 시간 내 다중 호출 → 마지막 1건만 처리.

```ts
new DebounceQueue(delay?: number)            // ms. 생략 시 다음 이벤트 루프 (setTimeout(_, undefined))
run(fn: () => void | Promise<void>): void
dispose(): void                              // 타이머·pending 정리
```
- `delay` ms 지난 뒤 가장 최근 `fn` 실행. 실행 중 도착한 추가 `run()`은 디바운스 지연 없이 현재 실행 직후 즉시 처리 (요청 누락 방지).
- fn throw 시 `SdError`로 감싸 `"error"` 이벤트 발행. 리스너 없으면 `consola` 로그.

## SerialQueue extends EventEmitter<{ error: SdError }>

큐에 추가된 함수들을 순차 실행.

```ts
new SerialQueue(gap: number = 0)             // 각 작업 사이 ms 간격
run(fn: () => void | Promise<void>): void
dispose(): void                              // 대기 큐 비우기 (실행 중은 완료됨)
```
- 하나 완료 후 다음 시작. 에러 발생해도 후속 작업 계속 실행. throw는 `SdError` 감싸서 `"error"` 이벤트 (리스너 없으면 `consola.error`).
- `gap>0` 이면 작업 간 `wait.time(gap)` 대기.

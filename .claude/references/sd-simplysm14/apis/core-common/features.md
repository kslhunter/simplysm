# @simplysm/core-common — features

비동기 큐와 타입 안전 이벤트 이미터.

## EventEmitter\<TEvents\>

브라우저·Node 공용 (내부 `EventTarget`). 타입 안전.

```typescript
interface MyEvents { data: string; error: Error; done: void; }
class MyEmitter extends EventEmitter<MyEvents> {}

const e = new MyEmitter();
e.on("data", (d) => ...);       // d: string
e.emit("data", "hello");
e.emit("done");                 // void 이벤트는 인자 없이
e.off("data", handler);
e.listenerCount("data");        // 등록된 수
e.dispose();                    // 모든 리스너 제거
```

같은 이벤트에 같은 리스너 중복 등록은 무시.

## DebounceQueue extends EventEmitter\<{ error: SdError }\>

연속 호출 중 마지막 작업만 실행.

```typescript
const q = new DebounceQueue(300);   // 300ms 지연 (생략 시 다음 이벤트 루프)
q.run(fn);                          // 이전 대기 함수 교체
q.on("error", (e) => ...);          // 작업 throw 시. 리스너 없으면 logger.error
q.dispose();                        // 타이머·대기 함수 정리
```

실행 도중 들어온 새 요청은 지연 없이 실행 완료 직후 즉시 처리 (놓침 방지).

## SerialQueue extends EventEmitter\<{ error: SdError }\>

순차 실행, 작업 사이 간격 옵션.

```typescript
const q = new SerialQueue(0);       // gap ms (기본 0)
q.run(asyncFn);                     // 큐에 추가, 자동 실행
q.on("error", ...);                 // 에러는 다음 작업에 영향 X (계속 실행)
q.dispose();                        // 대기 큐 비움 (현재 작업은 완료됨)
```

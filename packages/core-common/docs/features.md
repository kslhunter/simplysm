# 기능

## EventEmitter

타입 안전한 이벤트 에미터. `EventTarget` 기반으로 브라우저와 Node.js 모두에서 사용 가능하다.

```typescript
import { EventEmitter } from "@simplysm/core-common";

const emitter = new EventEmitter<{
  change: string;
  error: Error;
  ready: void;
}>();

// 리스너 등록 (동일 리스너 중복 등록 무시)
emitter.on("change", (data) => { /* data: string */ });

// 리스너 제거
emitter.off("change", listener);

// 이벤트 발생 (void 타입은 인자 없이 호출)
emitter.emit("change", "updated");
emitter.emit("ready");

// 리스너 수 확인
emitter.listenerCount("change");

// 정리 (Disposable 지원)
emitter.dispose();
// 또는
using emitter2 = new EventEmitter<{ tick: number }>();
```

### 상속 패턴

```typescript
interface MyEvents {
  data: string;
  error: Error;
}

class MyService extends EventEmitter<MyEvents> {
  process(): void {
    this.emit("data", "result");
  }
}
```

---

## DebounceQueue

디바운스된 비동기 작업 실행. delay 내 마지막 요청만 실행된다.

```typescript
import { DebounceQueue } from "@simplysm/core-common";

const queue = new DebounceQueue(300); // 300ms 디바운스 (생략 시 즉시 실행)

queue.on("error", (err) => { /* SdError */ });

// 300ms 내 마지막 호출만 실행
queue.run(async () => {
  await saveData();
});

queue.dispose();
// 또는
using queue2 = new DebounceQueue(100);
```

동작 방식:
- delay 내 새 요청이 들어오면 이전 요청을 취소하고 새 요청만 실행
- 실행 중 새 요청이 들어오면 실행 완료 후 **즉시** 새 요청 처리 (디바운스 delay 없이)
- 에러 발생 시 "error" 이벤트 리스너가 있으면 이벤트 발생, 없으면 consola로 로깅

---

## SerialQueue

순차 비동기 작업 실행. 작업 간 선택적 간격(gap) 설정 가능. 에러가 발생해도 후속 작업은 계속 실행된다.

```typescript
import { SerialQueue } from "@simplysm/core-common";

const queue = new SerialQueue(100); // 작업 간 100ms 간격 (기본값: 0)

queue.on("error", (err) => { /* SdError */ });

queue.run(async () => await task1());
queue.run(async () => await task2()); // task1 완료 + 100ms 후 실행

queue.dispose(); // 대기 중인 큐 비우기 (현재 실행 중인 작업은 완료)
// 또는
using queue2 = new SerialQueue();
```

---

## 에러 클래스

### SdError

에러 체인을 지원하는 기본 에러 클래스. ES2024 `cause` 속성을 활용한다. 메시지는 역순으로 `=>` 구분자로 조인된다.

```typescript
import { SdError } from "@simplysm/core-common";

// 메시지만
throw new SdError("작업 실패");

// 여러 메시지 (역순 조인)
throw new SdError("하위 메시지", "상위 메시지");
// 메시지: "상위 메시지 => 하위 메시지"

// 원인 에러 래핑
throw new SdError(originalError, "추가 컨텍스트");
// 메시지: "추가 컨텍스트 => 원본 에러 메시지"
// cause 속성에 originalError 저장
// stack에 원인 에러 스택도 포함 (---- cause stack ---- 구분자)
```

### ArgumentError

잘못된 인자를 YAML 형식으로 표시하는 에러. `SdError`를 상속한다.

```typescript
import { ArgumentError } from "@simplysm/core-common";

throw new ArgumentError({ userId: -1, name: "" });
// 메시지: "Invalid arguments.\n\nuserId: -1\nname: ''"

throw new ArgumentError("유효하지 않은 입력", { userId: -1 });
// 메시지: "유효하지 않은 입력\n\nuserId: -1"
```

### NotImplementedError

미구현 기능을 표시하는 에러. `SdError`를 상속한다.

```typescript
import { NotImplementedError } from "@simplysm/core-common";

throw new NotImplementedError();
// 메시지: "Not implemented"

throw new NotImplementedError("이 기능은 아직 구현되지 않았습니다");
// 메시지: "Not implemented: 이 기능은 아직 구현되지 않았습니다"
```

### TimeoutError

타임아웃 에러. `SdError`를 상속한다.

```typescript
import { TimeoutError } from "@simplysm/core-common";

throw new TimeoutError();
// 메시지: "Waiting time exceeded"

throw new TimeoutError(3);
// 메시지: "Waiting time exceeded(3 attempts)"

throw new TimeoutError(3, "API 응답 대기 초과");
// 메시지: "Waiting time exceeded(3 attempts): API 응답 대기 초과"
```

---

## 배열 확장 메서드

`import "@simplysm/core-common"` (side-effect import) 시 `Array.prototype`에 추가되는 메서드.

### 요소 접근

```typescript
[1, 2, 3].first();                          // 1
[1, 2, 3].first((x) => x > 1);             // 2
[1, 2, 3].last();                           // 3
[1, 2, 3].last((x) => x < 3);              // 2
[1, 2, 3].single((x) => x === 2);           // 2 (복수 매칭 시 ArgumentError)
```

### 필터링

```typescript
[1, null, 2, undefined].filterExists();      // [1, 2]
items.ofType("string");                      // string 타입만 필터
items.ofType(MyClass);                       // MyClass 인스턴스만 필터
await items.filterAsync(async (x) => check(x)); // 순차 비동기 필터
```

### 변환

```typescript
items.mapMany();                             // 2차원 -> 1차원 평탄화 (null 제거)
items.mapMany((x) => x.children);           // 매핑 후 평탄화
await items.mapAsync(async (x) => transform(x));       // 순차 비동기 매핑
await items.mapManyAsync(async (x) => getChildren(x)); // 순차 비동기 매핑 후 평탄화
await items.parallelAsync(async (x) => process(x));    // Promise.all 병렬 처리
```

### 그룹화/매핑

```typescript
items.groupBy((x) => x.category);           // { key, values }[]
items.groupBy((x) => x.cat, (x) => x.name); // 값 변환 포함

items.toMap((x) => x.id);                   // Map<id, item> (중복 키 시 ArgumentError)
items.toMap((x) => x.id, (x) => x.name);   // Map<id, name>
await items.toMapAsync(async (x) => x.id);  // 비동기 키 매핑

items.toArrayMap((x) => x.category);        // Map<category, item[]>
items.toArrayMap((x) => x.cat, (x) => x.name); // Map<category, name[]>

items.toSetMap((x) => x.category);           // Map<category, Set<item>>
items.toMapValues((x) => x.cat, (arr) => arr.length); // Map<cat, count>

items.toObject((x) => x.id);                // Record<string, item>
items.toObject((x) => x.id, (x) => x.name); // Record<string, name>

items.toTree("id", "parentId");              // TreeArray<T>[] (parentId가 null인 항목이 루트)
```

### 정렬/고유

```typescript
items.distinct();                            // 고유 요소 (객체: 딥 비교 O(n^2))
items.distinct({ matchAddress: true });      // 참조 비교 (Set 기반 O(n))
items.distinct({ keyFn: (x) => x.id });     // 커스텀 키 (O(n))

items.orderBy((x) => x.name);               // 오름차순 (null/undefined 우선)
items.orderByDesc((x) => x.score);          // 내림차순

items.shuffle();                             // 랜덤 셔플 (Fisher-Yates)
```

### 집계

```typescript
items.sum((x) => x.price);                  // 합계 (빈 배열이면 0)
items.min((x) => x.date);                   // 최솟값 (number | string)
items.max((x) => x.date);                   // 최댓값 (number | string)
```

### 비교/병합

```typescript
// 배열 diff (INSERT/DELETE/UPDATE)
items.diffs(target);
// 반환: { source, target }[]
// source만 있으면 DELETE, target만 있으면 INSERT, 둘 다 있으면 UPDATE

items.diffs(target, { keys: ["id"] });           // 키 기준 매칭
items.diffs(target, { excludes: ["updatedAt"] }); // 비교 제외 키

// 단방향 diff
items.oneWayDiffs(orgItems, "id");
items.oneWayDiffs(orgItems, (x) => x.id, { includeSame: true });
// 반환: { type: "create"|"update"|"same", item, orgItem }[]

// 배열 병합
items.merge(target);
items.merge(target, { keys: ["id"], excludes: ["updatedAt"] });
```

### 원본 변경 메서드 (@mutates)

```typescript
items.distinctThis();                        // 원본 배열에서 중복 제거
items.orderByThis((x) => x.name);           // 원본 배열 오름차순 정렬
items.orderByDescThis((x) => x.score);      // 원본 배열 내림차순 정렬
items.insert(2, newItem1, newItem2);         // 인덱스 2에 삽입
items.remove(item);                          // 참조 일치 항목 제거
items.remove((x) => x.expired);             // 조건 일치 항목 제거
items.toggle(item);                          // 있으면 제거, 없으면 추가
items.clear();                               // 전체 제거
```

### 내보내는 타입

```typescript
import type {
  ArrayDiffsResult,       // { source, target } 유니온
  ArrayOneWayDiffResult,  // { type, item, orgItem } 유니온
  TreeArray,              // T & { children: TreeArray<T>[] }
  ComparableType,         // string | number | boolean | DateTime | DateOnly | Time | undefined
} from "@simplysm/core-common";
```

---

## Map 확장 메서드

```typescript
const map = new Map<string, number[]>();

// 없으면 생성 (값 또는 팩토리 함수)
map.getOrCreate("key", []);                  // 직접 값
map.getOrCreate("key", () => []);            // 팩토리 함수
// 주의: V 타입이 함수이면 팩토리로 인식되므로 () => myFn 형태로 래핑 필요

// 값 갱신 (키가 없으면 prev는 undefined)
map.update("key", (prev) => [...(prev ?? []), 1]);
```

---

## Set 확장 메서드

```typescript
const set = new Set<string>();

set.adds("a", "b", "c");                    // 다수 추가 (체이닝)

set.toggle("a");                             // 있으면 제거, 없으면 추가
set.toggle("b", "add");                     // 강제 추가
set.toggle("b", "del");                     // 강제 제거
```

---

## 환경 변수

```typescript
import { env } from "@simplysm/core-common";

env.DEV;    // boolean -- 개발 모드 여부 (process.env.DEV를 JSON.parse)
env.VER;    // string | undefined -- 버전 문자열 (process.env.VER)
```

### `__DEV__` 글로벌 상수

빌드 시점에 치환되는 글로벌 상수. 라이브러리 빌드에서는 치환되지 않고, 클라이언트/서버 빌드에서 `define: { '__DEV__': 'true/false' }`로 치환된다.

```typescript
declare const __DEV__: boolean;

if (__DEV__) {
  // 개발 모드 전용 로직
}
```

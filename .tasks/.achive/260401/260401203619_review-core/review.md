# Code Review: core-*

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/core-common/src/`, `packages/core-browser/src/`, `packages/core-node/src/` |
| 분석 일시 | 2026-04-01 20:36 |
| 파일 수 | 50개 |
| 발견 이슈 | 14건 (Critical: 0, Medium: 4, Low: 10) |

---

## Medium

### LOGIC-001: getRelativeOffset에서 window.scrollX/Y를 무조건 더하는 오류

```
severity: Medium
category: 로직
location: packages/core-browser/src/extensions/html-element-ext.ts:71-76
```

**description:**
`getBoundingClientRect()`는 뷰포트 기준 좌표를 반환한다. `elementRect - parentRect` 차이에서 스크롤은 이미 상쇄된다. 여기에 `window.scrollX/Y`를 무조건 더하면, 부모가 `document.body`가 아닌 일반 `position: relative` 컨테이너일 때 페이지 스크롤 양만큼 위치가 틀어진다. 현재 코드는 `parentEl.scrollTop`도 더하고 있어 부모의 내부 스크롤은 반영하지만, 페이지 스크롤은 부모가 body인 경우에만 필요하다.

```typescript
// 현재 코드 (75-76행)
top: elementRect.top - parentRect.top + scrollTop + (parentEl.scrollTop || 0),
left: elementRect.left - parentRect.left + scrollLeft + (parentEl.scrollLeft || 0),
```

**suggestion:**
부모가 `document.body`인 경우에만 `window.scrollX/Y`를 더하거나, 함수의 사용 범위를 body 전용으로 제한한다.

---

### LOGIC-002: DateTime.parse()에서 Date.parse() 우선 호출로 인한 환경 의존성

```
severity: Medium
category: 로직
location: packages/core-common/src/types/date-time.ts:76-79
```

**description:**
`DateTime.parse()`는 가장 먼저 `Date.parse()`를 호출하고, 성공하면 그 결과를 사용한다. `'2025-01-15 10:30:00'` 형식(공백 구분자, 타임존 없음)의 `Date.parse()` 동작은 ECMAScript 명세에서 구현 정의(implementation-defined)다. Chrome에서는 로컬 시간으로 파싱되지만, 다른 JS 엔진에서는 UTC로 파싱될 수 있다. 아래에 이 형식을 명시적으로 로컬 시간으로 파싱하는 정규식 분기(`match3`)가 있지만, `Date.parse()`가 먼저 성공하면 도달하지 않는다.

```typescript
// 76-79행: Date.parse()가 먼저 성공하면 match3에 도달 불가
const parsedTick = Date.parse(str);
if (!Number.isNaN(parsedTick)) {
  return new DateTime(parsedTick);
}
```

**suggestion:**
명시적 정규식 매칭을 `Date.parse()`보다 먼저 수행하도록 순서를 변경하거나, `Date.parse()`를 ISO 8601 패턴(`T` 구분자 + 타임존 포함)에만 한정한다.

---

### LOGIC-003: mapMany()가 filterExists()를 암묵적으로 호출하여 null/undefined 제거

```
severity: Medium
category: 로직
location: packages/core-common/src/extensions/arr-ext.ts:110-113
```

**description:**
`mapMany()` 구현에서 `flat()` 후 `filterExists()`를 호출하여 null/undefined 요소를 제거한다. 함수 이름 `mapMany`는 `flatMap`과 동등한 동작을 기대하게 하지만, null/undefined 필터링이라는 추가 동작이 숨겨져 있다. 호출자가 null/undefined를 포함하는 결과를 기대하는 경우 데이터 손실이 발생할 수 있다. 단일 책임 원칙(함수가 이름에서 드러나지 않는 일을 수행)에도 위배된다.

```typescript
mapMany<T, R>(selector?: (item: T, index: number) => R[]): T | R[] {
  const arr = selector ? this.map(selector) : this;
  return arr.flat().filterExists(); // ← 숨겨진 null/undefined 필터링
},
```

**suggestion:**
`filterExists()` 호출을 제거하여 순수한 flatMap 동작으로 변경하거나, 의도적 설계라면 함수 이름이나 문서에 필터링 동작을 명시한다.

---

### DESIGN-001: FsWatcher _retryCount 초기화로 인한 무한 재시도 가능성

```
severity: Medium
category: 설계
location: packages/core-node/src/features/fs-watcher.ts:192-238
```

**description:**
EPERM 복구에 성공하면 `_retryCount = 0`으로 초기화한다. 이후 다시 EPERM이 발생하면 또 3회 재시도하고, 성공하면 다시 초기화되는 패턴이 무한히 반복될 수 있다. 파일 시스템 권한 문제가 간헐적으로 발생하는 환경에서 watcher가 끊임없이 재시작을 반복하며 리소스를 소모할 수 있다.

**suggestion:**
일정 시간 윈도우 내 재시도 횟수를 제한하거나, 연속 복구 횟수에 상한을 두어 반복적 EPERM 상황에서 최종적으로 포기하도록 한다.

---

## Low

### LOGIC-004: addDays()가 DST 전환 시 잘못된 결과를 반환할 수 있음

```
severity: Low
category: 로직
location: packages/core-common/src/types/date-time.ts:325-327, packages/core-common/src/types/date-only.ts:318-319
```

**description:**
`addDays()`는 tick에 `days * 24 * 60 * 60 * 1000`을 더하여 계산한다. DST 전환이 있는 타임존에서는 하루가 23시간 또는 25시간일 수 있어 시간이 밀릴 수 있다. 한국(KST)은 DST를 사용하지 않으므로 주 사용 환경에서는 문제없지만, 다른 타임존에서 사용 시 날짜가 잘못될 수 있다.

**suggestion:**
한국 KST 전용이라면 현 상태 유지 가능. 다른 타임존 지원이 필요하다면 `setDay(this.day + days)` 방식으로 변경한다.

---

### CONSIST-001: orderBy와 orderByThis에서 selector fallback 처리 불일치

```
severity: Low
category: 일관성
location: packages/core-common/src/extensions/arr-ext.ts:321 vs 585
```

**description:**
`orderBy()`에서는 `selector == null ? p : selector(p)` 패턴으로 selector 없을 때 원소 자체를 사용하지만, `orderByThis()`에서는 `selector?.(p) ?? p` 패턴을 사용한다. 후자는 selector가 `undefined`를 반환하면 fallback으로 원소 자체(`p`)를 사용하여 `orderBy()`와 다른 동작을 한다.

**suggestion:**
두 메서드에서 동일한 패턴(`selector == null ? p : selector(p)`)을 사용하도록 통일한다.

---

### LOGIC-005: IndexedDbVirtualFs listChildren에서 디렉토리 판단 부정확

```
severity: Low
category: 로직
location: packages/core-browser/src/utils/IndexedDbVirtualFs.ts:67-69
```

**description:**
동일 `firstSeg`에 대해 첫 번째로 커서에 잡힌 엔트리의 kind만으로 `isDirectory`를 판단한다. 예를 들어 `/a/b`(kind=file)와 `/a/b/c`(kind=file)가 모두 존재할 때, `/a/b`가 먼저 잡히면 `b`는 file로 판단되지만, `/a/b/c`가 존재하므로 `b`는 디렉토리 역할도 한다. `map.has` 체크로 첫 값만 저장하고 이후 업데이트하지 않는다.

**suggestion:**
이미 map에 존재하더라도 `segments.length > 1`인 경우 `isDirectory`를 true로 업데이트하는 로직을 추가한다.

---

### PERF-001: ensureDir가 각 세그먼트마다 별도 트랜잭션을 사용

```
severity: Low
category: 성능
location: packages/core-browser/src/utils/IndexedDbVirtualFs.ts:81-98
```

**description:**
`ensureDir`는 경로의 각 세그먼트에 대해 `getEntry`와 `putEntry`를 호출하며, 각각이 `withStore`를 통해 별도 트랜잭션을 열고 닫는다. 깊은 경로(5단계)에서 최대 10개의 트랜잭션이 순차 실행된다.

**suggestion:**
`withStore`를 한 번만 호출하여 단일 readwrite 트랜잭션 안에서 모든 세그먼트를 처리한다.

---

### LOGIC-006: cpx spawn/spawnSync에서 배열 형태 stdio 미처리

```
severity: Low
category: 로직
location: packages/core-node/src/utils/cp.ts:132, 186
```

**description:**
`hasPipe`는 `opts.stdio === "pipe"` 또는 `undefined`일 때만 true이다. `stdio`가 `["pipe", "pipe", "pipe"]` 같은 배열 형태로 지정되면 `hasPipe`가 false가 되어 stdout/stderr를 빈 문자열로 반환한다.

**suggestion:**
배열 형태의 stdio도 처리하거나, JSDoc에 배열 stdio 사용 시 stdout/stderr가 빈 문자열로 반환됨을 명시한다.

---

### CONSIST-002: readBuffer 반환 타입이 프로젝트 코딩 규칙과 불일치

```
severity: Low
category: 일관성
location: packages/core-node/src/utils/fs.ts:238-256
```

**description:**
CLAUDE.md의 코딩 규칙에 `Buffer 금지 → Uint8Array` 사용이 명시되어 있지만, `readBufferSync`와 `readBuffer`의 반환 타입이 `Buffer`이다. Node.js의 `Buffer`는 `Uint8Array`의 서브클래스이므로 런타임에서는 문제가 없지만, 공개 API가 프로젝트 규칙과 불일치한다.

**suggestion:**
반환 타입을 `Uint8Array`로 변경하거나, core-node에서 `Buffer`를 예외로 허용한다면 그 근거를 문서화한다.

---

### DESIGN-002: fs-watcher unlink 후 change 병합 의도 불명확

```
severity: Low
category: 설계
location: packages/core-node/src/features/fs-watcher.ts:301
```

**description:**
`prevEvent === "unlink" && event === "change"` 조건에서 결과를 `"add"`로 설정한다. 기존에 존재하던 파일이 삭제 후 재생성되어 수정된 경우, 소비자 입장에서 '내용 변경'(`change`)이 더 자연스러울 수 있다. 이전 debounce 사이클의 전달 여부에 따라 달라지므로 의도가 불명확하다.

**suggestion:**
이 케이스의 의도를 주석으로 명확히 기술한다.

---

### DESIGN-003: parseInt에서 문자열 중간 하이픈이 음수 부호로 오해석 가능

```
severity: Low
category: 설계
location: packages/core-common/src/utils/num.ts:16-24
```

**description:**
비숫자 문자 제거 시 하이픈(-)을 유지하므로, 전화번호 `'010-1234-5678'` 입력 시 `'010-12345678'` → `Number.parseInt() = 10`이 된다. 주석에 `'A-123B → -123'` 동작이 문서화되어 있으나, 하이픈 포함 입력에 대한 안내가 부족하다.

**suggestion:**
하이픈을 첫 번째 위치에서만 유지하도록 정규식을 수정하거나, 위험한 입력 패턴을 문서에 추가한다.

---

### CONSIST-003: spawn/SpawnProcess 네이밍이 문서의 exec/ExecProcess와 불일치

```
severity: Low
category: 일관성
location: packages/core-node/src/utils/cp.ts:121, 173
```

**description:**
패키지 CLAUDE.md에서는 `cpx.exec()`, `ExecProcess`로 설명하고 있지만, 실제 코드에서는 `spawn()`, `SpawnProcess`로 명명되어 있다.

**suggestion:**
CLAUDE.md의 설명을 실제 함수명(`spawn`, `SpawnProcess`)에 맞게 수정한다.

---

### PERF-002: findAllParentChildPaths에서 각 디렉토리 레벨마다 순차 glob 실행

```
severity: Low
category: 성능
location: packages/core-node/src/utils/fs.ts:538-559
```

**description:**
`fromPath`에서 루트까지 올라가면서 각 디렉토리에서 `await glob()`을 순차 호출한다. 각 레벨의 glob은 독립적이므로 병렬 실행이 가능하다.

**suggestion:**
모든 레벨의 glob 패턴을 먼저 수집한 뒤 `Promise.all()`로 병렬 실행한다.

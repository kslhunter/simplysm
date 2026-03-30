# 코드 리뷰: core-* 패키지

| 항목 | 내용 |
|------|------|
| 분석 대상 | `packages/core-common/src`, `packages/core-node/src`, `packages/core-browser/src` |
| 분석 일시 | 2026-03-26 22:25 |
| 파일 수 | 50개 |
| 발견 이슈 | **17건** (Critical: 0, Medium: 5, Low: 12) |

---

## Medium (5건)

### LOGIC-001

```
id: LOGIC-001
severity: Medium
category: 로직
location: packages/core-common/src/types/date-only.ts:277
title: DateOnly.setYear()가 윤년 2월 29일을 3월 1일로 오버플로우시킴
description: setYear(year)는 new DateOnly(year, this.month, this.day)를 호출한다.
  윤년 2월 29일에서 비윤년으로 변경 시 (예: 2024-02-29 → setYear(2025))
  JavaScript Date가 3월 1일로 자동 오버플로우된다.
  setMonth()은 normalizeMonth()로 일수를 클램핑하지만, setYear()는 이 처리가 누락되어 있다.
  addYears()도 setYear()를 호출하므로 동일 문제 발생.
suggestion: setYear() 내부에서도 대상 연도/월의 최대 일수로 day를 클램핑한다.
  예: const lastDay = new Date(year, this.month, 0).getDate();
  return new DateOnly(year, this.month, Math.min(this.day, lastDay));
```

### LOGIC-002

```
id: LOGIC-002
severity: Medium
category: 로직
location: packages/core-common/src/types/date-time.ts:209
title: DateTime.setYear()도 윤년 2월 29일 오버플로우 동일 문제
description: DateTime.setYear(year)은 new DateTime(year, this.month, this.day, ...)를 호출한다.
  DateOnly.setYear()과 동일하게 normalizeMonth() 없이 직접 생성하므로,
  2024-02-29에서 setYear(2025) 호출 시 2025-03-01이 된다.
suggestion: DateOnly.setYear()와 동일하게 normalizeMonth()를 적용하거나
  대상 월의 최대 일수로 day를 클램핑한다.
```

### LOGIC-003

```
id: LOGIC-003
severity: Medium
category: 로직
location: packages/core-common/src/env.ts:19
title: env.DEV가 비표준 truthy 문자열에서 SyntaxError 발생
description: JSON.parse(String(_raw["DEV"]))로 DEV 환경변수를 파싱한다.
  process.env.DEV가 "TRUE", "True", "yes", "on" 등 비표준 문자열이면
  JSON.parse가 SyntaxError를 던진다. "1"이면 숫자 1이 반환되어 boolean 타입과 불일치.
  이 모듈은 라이브러리 초기화 시점에 실행되므로 전체 애플리케이션이 시작 불가.
suggestion: JSON.parse 대신 명시적 truthy 체크를 사용한다.
  예: DEV: ["true", "1"].includes(String(_raw["DEV"]).toLowerCase())
```

### LOGIC-004

```
id: LOGIC-004
severity: Medium
category: 로직
location: packages/core-node/src/features/fs-watcher.ts:84-91
title: FsWatcher.watch()에서 error 발생 시 watcher가 close되지 않아 리소스 누수
description: watch() 정적 메서드에서 error 이벤트 발생 시 Promise를 reject하지만,
  watcher.close()를 호출하지 않는다. reject된 후 호출자는 watcher 참조를 받지 못하므로
  chokidar FSWatcher가 계속 실행되며 리소스 누수가 발생한다.
  또한 ready 후에도 error 리스너(reject 콜백)가 남아있어 불필요한 참조가 유지된다.
suggestion: error 발생 시 watcher.close()를 호출하고, ready/error 중 하나가 발생하면
  다른 리스너를 제거한다.
```

### LOGIC-005

```
id: LOGIC-005
severity: Medium
category: 로직
location: packages/core-browser/src/utils/fetch.ts:36
title: fetchUrlBytes에서 Content-Length 불일치 시 방어 로직 부재
description: Content-Length 헤더 값으로 Uint8Array를 사전 할당(line 29)한 뒤,
  result.set(value, receivedLength)로 데이터를 복사한다(line 36).
  서버가 Content-Length를 실제보다 작게 보고하면 RangeError가 발생한다.
  반대로 실제 데이터가 Content-Length보다 적으면 뒤쪽에 0으로 채워진 불완전한 데이터가
  그대로 반환된다(line 41에서 전체 버퍼를 반환).
suggestion: 수신 데이터 초과 시 chunked 방식으로 폴백하고,
  수신량 부족 시 result.subarray(0, receivedLength)로 실제 수신량만큼 잘라 반환한다.
```

---

## Low (12건)

### SEC-001

```
id: SEC-001
severity: Low
category: 보안
location: packages/core-common/src/utils/template-strings.ts:67
title: SQL 템플릿 태그가 보간 값을 이스케이핑 없이 직접 결합
description: tsql(), mysql(), pgsql() 함수는 보간된 값을 이스케이핑 없이 문자열에 결합한다.
  파일 헤더에 "IDE 코드 하이라이팅 지원용"으로 명시되어 있으나,
  반환값이 실제 쿼리 실행에 사용될 경우 SQL Injection 위험이 존재한다.
  JSDoc 예제에서도 WHERE Name LIKE '%${keyword}%' 같은 위험 패턴을 보여준다.
suggestion: JSDoc에 "실제 쿼리 실행에는 파라미터 바인딩을 사용하고,
  이 함수의 반환값을 직접 쿼리 문자열로 사용하지 말 것"이라는 경고를 추가한다.
```

### LOGIC-006

```
id: LOGIC-006
severity: Low
category: 로직
location: packages/core-common/src/extensions/arr-ext.ts:112
title: mapMany()가 filterExists()를 호출하여 null/undefined를 암묵적으로 제거
description: mapMany()는 flat() 후 filterExists()를 호출하여 null/undefined를 자동 필터링한다.
  이 동작은 함수명(mapMany = flatMap)에서 유추할 수 없으며,
  타입 정의(arr-ext.types.ts)에서도 명시되지 않는다.
  호출자가 null을 포함한 결과를 기대하는 경우 데이터 손실이 발생할 수 있다.
suggestion: filterExists() 호출을 제거하여 순수 flatMap 동작으로 변경하거나,
  타입 정의와 JSDoc에 null/undefined 필터링 동작을 명시적으로 문서화한다.
```

### LOGIC-007

```
id: LOGIC-007
severity: Low
category: 로직
location: packages/core-common/src/utils/json.ts:231
title: DEV 모드에서 전체 JSON 문자열이 에러 메시지에 포함됨
description: 개발 모드에서 JSON 파싱 실패 시 "JSON 파싱 오류: \n" + json으로
  전체 JSON을 에러 메시지에 포함시킨다.
  대용량 JSON(수 MB)이면 에러 객체의 메모리 사용량이 급증하고,
  JSON에 토큰/비밀번호 등이 포함되어 있으면 로그로 노출될 수 있다.
suggestion: DEV 모드에서도 JSON 문자열의 일부만 포함하도록 제한한다.
  예: json.substring(0, 500) + (json.length > 500 ? "..." : "")
```

### LOGIC-008

```
id: LOGIC-008
severity: Low
category: 로직
location: packages/core-common/src/utils/date-format.ts:168
title: date-format의 순차 replace가 이중 치환될 가능성
description: format() 함수는 패턴을 순차적으로 replace한다.
  이전 치환 결과 문자열이 다음 패턴과 일치하면 이중 치환이 발생할 수 있다.
  현재 한국어 요일명("일","월","화","수","목","금","토")에는 포맷 문자가 없어
  실제 문제는 없으나, 다국어 지원 추가 시 문제가 될 수 있다.
suggestion: 토큰 기반 파싱 방식으로 변경하거나,
  weekStrings에 패턴 문자가 포함되지 않아야 한다는 제약을 문서화한다.
```

### LOGIC-009

```
id: LOGIC-009
severity: Low
category: 로직
location: packages/core-common/src/types/date-only.ts:317
title: DateOnly.addDays()가 DST 전환 시 잘못된 결과를 반환할 수 있음
description: addDays()는 tick + days * MS_PER_DAY로 계산한다.
  DST(서머타임) 적용 타임존에서는 하루가 23시간 또는 25시간일 수 있다.
  예: US Eastern에서 2024-11-03(fall back) addDays(1) → 23:00 Nov 3이 되어
  getDate()가 여전히 3을 반환하므로 addDays(1)이 같은 날짜를 반환한다.
  (참고: 한국(KST)은 DST를 사용하지 않으므로 KST 환경에서는 발생하지 않음)
suggestion: tick 기반 산술 대신 날짜 컴포넌트 기반으로 변경한다.
  예: return this.setDay(this.day + days);
```

### DESIGN-001

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/core-common/src/extensions/arr-ext.ts:606
title: Array.remove()가 함수 요소를 참조로 제거할 수 없음
description: remove(itemOrSelector)는 인자가 함수이면 조건 함수로 해석한다.
  따라서 함수를 요소로 가지는 배열(예: [fn1, fn2])에서 특정 함수를 참조로 제거할 수 없다.
  fn1을 전달하면 조건 함수로 해석되어 fn1(element)가 호출된다.
suggestion: 별도의 removeBy(predicate) 메서드를 제공하거나,
  { item: T } 래퍼 객체를 받는 오버로드를 추가한다.
```

### DESIGN-002

```
id: DESIGN-002
severity: Low
category: 설계
location: packages/core-node/src/features/fs-watcher.ts:87-90
title: FsWatcher.watch()에서 ready/error 리스너가 상호 정리되지 않음
description: watch()의 Promise에서 ready와 error 리스너를 동시에 등록한다.
  ready 발생 후 error 리스너(reject)가 남아있고,
  error 발생 후 ready 리스너(resolve)가 남아있다.
  Promise 특성상 이미 settle된 후의 호출은 무시되지만, 불필요한 참조가 유지된다.
suggestion: once 이벤트를 사용하거나, resolve/reject 시 다른 리스너를 제거한다.
```

### DESIGN-003

```
id: DESIGN-003
severity: Low
category: 설계
location: packages/core-node/src/features/fs-watcher.ts:137
title: onChange 콜백의 에러가 호출자에게 전파되지 않음
description: onChange에 전달된 콜백이 에러를 throw하면,
  DebounceQueue 내부에서 consola로 로깅만 되고 호출자에게 전달되지 않는다.
  FsWatcher에서 DebounceQueue의 error 이벤트를 리스닝하지 않으므로
  사용자가 콜백 에러를 인지하기 어렵다.
suggestion: FsWatcher에 onError 메서드를 추가하거나,
  DebounceQueue의 error 이벤트를 FsWatcher 레벨에서 전파하는 메커니즘을 추가한다.
```

### DESIGN-004

```
id: DESIGN-004
severity: Low
category: 설계
location: packages/core-node/src/worker/worker.ts:131
title: terminate() 후 call() 호출 시 Promise가 영원히 pending
description: terminate()가 호출되면 pending 요청을 모두 reject하고 워커를 종료한다.
  그러나 terminate() 후 call()이 호출되면 새 pending 요청이 추가되지만,
  워커가 이미 종료되어 응답이 오지 않으므로 Promise가 영원히 resolve/reject되지 않는다.
suggestion: call()에서 _isTerminated 상태를 확인하여 즉시 reject하는 가드를 추가한다.
```

### DESIGN-005

```
id: DESIGN-005
severity: Low
category: 설계
location: packages/core-node/src/worker/worker.ts:188
title: Worker Proxy에서 then/Symbol 접근 시 의도치 않은 동작
description: Proxy의 get 트랩에서 모든 프로퍼티 접근을 워커 메서드 호출 함수로 반환한다.
  Symbol.toPrimitive, Symbol.iterator 등의 Symbol 접근이나
  Promise 체이닝 시 접근되는 "then" 프로퍼티에 대해서도 함수를 반환한다.
  특히 "then"에 함수를 반환하면 await workerProxy 시 thenable로 오인될 수 있다.
suggestion: get 트랩에서 typeof prop === "symbol"이면 undefined를 반환하고,
  prop === "then"인 경우에도 undefined를 반환하여 thenable 오인을 방지한다.
```

### DESIGN-006

```
id: DESIGN-006
severity: Low
category: 설계
location: packages/core-browser/src/utils/IndexedDbVirtualFs.ts:60
title: listChildren에서 파일과 디렉토리가 동일 이름으로 존재할 때 isDirectory 부정확
description: listChildren에서 map.has(firstSeg) 체크로 이미 등록된 이름은 건너뛴다.
  prefix 아래에 "foo" (파일)과 "foo/bar" (디렉토리 하위)가 모두 존재하는 경우,
  커서가 "foo"를 먼저 방문하면 isDir=false로 등록되고
  이후 "foo/bar"는 무시되어 "foo"가 디렉토리임을 감지하지 못한다.
suggestion: 이미 등록된 항목이라도 새 결과가 디렉토리를 나타내면(segments.length > 1)
  isDirectory를 true로 갱신하도록 한다.
```

### DESIGN-007

```
id: DESIGN-007
severity: Low
category: 설계
location: packages/core-browser/src/utils/IndexedDbStore.ts:27
title: onupgradeneeded에서 기존 스토어의 스키마 변경을 처리하지 않음
description: onupgradeneeded에서 objectStoreNames.contains 체크로 이미 존재하는 스토어는 건너뛴다.
  DB 버전을 올리면서 기존 스토어의 keyPath 변경이나 인덱스 추가/삭제가 필요한 경우
  마이그레이션을 전혀 처리하지 않는다.
suggestion: event.oldVersion을 활용한 버전별 마이그레이션 로직을 지원하거나,
  최소한 keyPath 불일치 시 경고/에러를 발생시키도록 한다.
```

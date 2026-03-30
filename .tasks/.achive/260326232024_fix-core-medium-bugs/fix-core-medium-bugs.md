# Feature 1.1 core-* Medium 버그 수정

## 참조 자료

- [리뷰 리포트](../260326222537_review-core/review.md)

### 대상 이슈

| ID | 파일 | 요약 |
|----|------|------|
| LOGIC-001 | `packages/core-common/src/types/date-only.ts:277` | DateOnly.setYear() 윤년 2/29 오버플로우 |
| LOGIC-002 | `packages/core-common/src/types/date-time.ts:209` | DateTime.setYear() 윤년 2/29 오버플로우 |
| LOGIC-003 | `packages/core-common/src/env.ts:19` | env.DEV JSON.parse 비표준 값 SyntaxError |
| LOGIC-004 | `packages/core-node/src/features/fs-watcher.ts:84-91` | FsWatcher.watch() error 시 리소스 미정리 |
| LOGIC-005 | `packages/core-browser/src/utils/fetch.ts:36` | fetchUrlBytes Content-Length 불일치 방어 부재 |

### 설계 결정

| # | 결정사항 | 선택 | 근거 |
|---|---------|------|------|
| D1 | env.DEV truthy 값 범위 | "true", "1", "yes", "on" (대소문자 무시) | 다양한 환경(Docker, CI, 수동 설정) 호환을 위해 넓은 범위 채택 |
| D2 | fetchUrlBytes Content-Length 초과 처리 | 명확한 에러 메시지로 교체 | HTTP 프로토콜 위반이므로 에러가 적절. 기존 RangeError는 원인 불명확 |
| D3 | fetchUrlBytes Content-Length 부족 처리 | 에러 발생 | 데이터 불완전은 즉시 감지되어야 함. 0-padded 반환은 데이터 손상과 동일 |

## 요구명세

```gherkin
Feature: 1.1 core-* Medium 버그 수정

  Rule: DateOnly.setYear()는 대상 월의 최대 일수로 day를 클램핑한다

    Scenario: 윤년 2월 29일에서 비윤년으로 연도 변경
      Given DateOnly가 2024-02-29로 생성되어 있다
      When setYear(2025)를 호출한다
      Then 결과는 2025-02-28이다

    Scenario: 윤년 2월 29일에서 윤년으로 연도 변경
      Given DateOnly가 2024-02-29로 생성되어 있다
      When setYear(2028)를 호출한다
      Then 결과는 2028-02-29이다

    Scenario: 일수 변동이 없는 연도 변경
      Given DateOnly가 2024-01-31로 생성되어 있다
      When setYear(2025)를 호출한다
      Then 결과는 2025-01-31이다

    Scenario: addYears를 통한 윤년 오버플로우 방지
      Given DateOnly가 2024-02-29로 생성되어 있다
      When addYears(1)을 호출한다
      Then 결과는 2025-02-28이다

  Rule: DateTime.setYear()도 대상 월의 최대 일수로 day를 클램핑한다

    Scenario: 윤년 2월 29일에서 비윤년으로 연도 변경 (시간 유지)
      Given DateTime이 2024-02-29T10:30:00.000으로 생성되어 있다
      When setYear(2025)를 호출한다
      Then 결과는 2025-02-28T10:30:00.000이다

    Scenario: addYears를 통한 윤년 오버플로우 방지 (시간 유지)
      Given DateTime이 2024-02-29T10:30:00.000으로 생성되어 있다
      When addYears(1)을 호출한다
      Then 결과는 2025-02-28T10:30:00.000이다

  Rule: env.DEV는 비표준 환경변수 값에서도 안전하게 boolean을 반환한다

    Scenario: 표준 "true" 값
      Given process.env.DEV가 "true"이다
      When env.DEV를 참조한다
      Then 결과는 boolean true이다

    Scenario: 대문자 "TRUE"
      Given process.env.DEV가 "TRUE"이다
      When env.DEV를 참조한다
      Then 결과는 boolean true이다

    Scenario: 숫자 "1"
      Given process.env.DEV가 "1"이다
      When env.DEV를 참조한다
      Then 결과는 boolean true이다

    Scenario: "yes" 값
      Given process.env.DEV가 "yes"이다
      When env.DEV를 참조한다
      Then 결과는 boolean true이다

    Scenario: "on" 값
      Given process.env.DEV가 "on"이다
      When env.DEV를 참조한다
      Then 결과는 boolean true이다

    Scenario: "false" 값
      Given process.env.DEV가 "false"이다
      When env.DEV를 참조한다
      Then 결과는 boolean false이다

    Scenario: 미설정
      Given process.env.DEV가 설정되지 않았다
      When env.DEV를 참조한다
      Then 결과는 boolean false이다

    Scenario: 빈 문자열
      Given process.env.DEV가 ""이다
      When env.DEV를 참조한다
      Then 결과는 boolean false이다

    Scenario: 비표준 문자열 "abc"
      Given process.env.DEV가 "abc"이다
      When env.DEV를 참조한다
      Then 결과는 boolean false이다

  Rule: FsWatcher.watch()는 error 발생 시 watcher를 정리하고 reject한다

    Scenario: watch 초기화 중 error 발생
      Given FsWatcher.watch()가 호출된다
      When chokidar가 error 이벤트를 발생시킨다
      Then Promise가 해당 error로 reject된다
      And watcher가 close된다

    Scenario: watch 초기화 성공 후 error 리스너 정리
      Given FsWatcher.watch()가 호출된다
      When chokidar가 ready 이벤트를 발생시킨다
      Then Promise가 FsWatcher 인스턴스로 resolve된다
      And 초기화용 error 리스너가 제거된다

  Rule: fetchUrlBytes는 Content-Length 불일치에 방어적으로 동작한다

    Scenario: 실제 데이터가 Content-Length를 초과
      Given 서버가 Content-Length: 100으로 응답한다
      When 실제로 150바이트를 수신한다
      Then 명확한 에러 메시지와 함께 에러가 발생한다

    Scenario: 실제 데이터가 Content-Length보다 부족
      Given 서버가 Content-Length: 100으로 응답한다
      When 실제로 80바이트만 수신한다
      Then 명확한 에러 메시지와 함께 에러가 발생한다

    Scenario: Content-Length와 실제 데이터가 일치
      Given 서버가 Content-Length: 100으로 응답한다
      When 실제로 100바이트를 수신한다
      Then 100바이트의 Uint8Array가 반환된다
```

## 구현계획

### 배경

core-common, core-node, core-browser 패키지의 유틸리티 함수에서 발견된 5건의 Medium 버그를 수정한다. 각 버그는 독립적이며, 기존 API 시그니처를 변경하지 않는 내부 로직 수정이다.

### 목표

- DateOnly/DateTime.setYear()의 윤년 2/29 오버플로우 방지
- env.DEV의 비표준 환경변수 값 안전 처리
- FsWatcher.watch()의 error 시 리소스 정리
- fetchUrlBytes의 Content-Length 불일치 방어

### 비목표

- Low severity 이슈 수정 (별도 Feature에서 처리)
- 기존 public API 시그니처 변경
- 새로운 public API 추가

### 설계

#### DateOnly.setYear() / DateTime.setYear()

대상 연도/월의 마지막 일수를 계산하여 day를 클램핑한다. `normalizeMonth()`와 동일한 로직이지만, 월 정규화가 불필요하므로 `new Date(year, this.month, 0).getDate()`로 직접 계산한다.

```
setYear(year) {
  const lastDay = new Date(year, this.month, 0).getDate();
  const day = Math.min(this.day, lastDay);
  return new DateOnly(year, this.month, day);
}
```

#### env.DEV

`JSON.parse()` 대신 truthy 문자열 목록(`"true"`, `"1"`, `"yes"`, `"on"`)과 대소문자 무시 비교한다.

```
DEV: ["true", "1", "yes", "on"].includes(
  String(_raw["DEV"] ?? "").toLowerCase()
)
```

#### FsWatcher.watch()

`once` 이벤트를 사용하여 ready/error 중 하나만 처리되도록 하고, error 시 `watcher.close()`를 호출한다.

```
watcher._watcher.once("ready", () => resolve(watcher));
watcher._watcher.once("error", (err) => {
  watcher.close().then(() => reject(err), () => reject(err));
});
```

#### fetchUrlBytes

수신 루프에서 `receivedLength + value.length > contentLength` 검사를 추가하여 초과 시 에러를 던진다. 루프 종료 후 `receivedLength < contentLength`이면 부족 에러를 던진다.

### 대안 검토

| 접근 방식 | 선택 여부 | 이유 |
|-----------|-----------|------|
| setYear()에서 normalizeMonth() 재사용 | 미채택 | 월 정규화가 불필요한 상황에서 오버스펙. 직접 계산이 간결 |
| env.DEV에서 `!!` 연산자로 truthy 변환 | 미채택 | 빈 문자열 외 모든 문자열이 truthy가 되어 "false"도 true로 평가됨 |
| fetchUrlBytes 초과 시 chunked 폴백 | 미채택 | 초과는 HTTP 프로토콜 위반이므로 에러가 적절 |

### Vertical Slices

#### Slice 1: DateOnly/DateTime setYear 윤년 클램핑
- [x] 완료
- **구현 내용:** DateOnly.setYear()와 DateTime.setYear()에 day 클램핑 로직 추가
- **Scenarios:**
  - Scenario: 윤년 2월 29일에서 비윤년으로 연도 변경
  - Scenario: 윤년 2월 29일에서 윤년으로 연도 변경
  - Scenario: 일수 변동이 없는 연도 변경
  - Scenario: addYears를 통한 윤년 오버플로우 방지
  - Scenario: 윤년 2월 29일에서 비윤년으로 연도 변경 (시간 유지)
  - Scenario: addYears를 통한 윤년 오버플로우 방지 (시간 유지)

#### Slice 2: env.DEV 안전 파싱
- [x] 완료
- **구현 내용:** JSON.parse를 truthy 문자열 목록 비교로 교체
- **Scenarios:**
  - Scenario: 표준 "true" 값
  - Scenario: 대문자 "TRUE"
  - Scenario: 숫자 "1"
  - Scenario: "yes" 값
  - Scenario: "on" 값
  - Scenario: "false" 값
  - Scenario: 미설정
  - Scenario: 빈 문자열
  - Scenario: 비표준 문자열 "abc"

#### Slice 3: FsWatcher.watch() 리소스 정리
- [x] 완료
- **구현 내용:** once 이벤트 사용, error 시 watcher.close() 호출
- **Scenarios:**
  - Scenario: watch 초기화 중 error 발생
  - Scenario: watch 초기화 성공 후 error 리스너 정리

#### Slice 4: fetchUrlBytes Content-Length 방어
- [x] 완료
- **구현 내용:** 수신 루프에서 초과/부족 검사 추가
- **Scenarios:**
  - Scenario: 실제 데이터가 Content-Length를 초과
  - Scenario: 실제 데이터가 Content-Length보다 부족
  - Scenario: Content-Length와 실제 데이터가 일치

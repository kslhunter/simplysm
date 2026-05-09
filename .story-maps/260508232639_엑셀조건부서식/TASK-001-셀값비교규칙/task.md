# TASK-001-셀값비교규칙

## 메타
- Activity: A1. 조건부 강조 규칙 적용
- specified: 2026-05-09

## 요약
빌더 코드 작성자가 셀 값의 비교 결과에 따라 강조 서식을 부여하기 위해 cellIs 조건부 서식 규칙을 셀/범위에 적용한다.

## Stories

- [ ] Story 1: 빌더 코드 작성자가 임계치 미달/초과 강조를 위해 단일 비교 연산자(`<`, `>`, `<=`, `>=`, `=`, `<>`) 기반 cellIs 규칙을 셀/범위에 적용한다.
  > [2026-05-08, paste] "`cellIs` (operator + formula): `<`, `>`, `<=`, `>=`, `=`, `<>`, `between`"
  > 출처: source.md "기대 동작"

  - **AC**: 조건부 서식은 시트 단위 메서드 `sheet.addConditionalFormat({ ref, rules })` 로 노출한다. `ref` 는 Excel 주소 문자열(단일 셀 `"A1"` 또는 범위 `"A1:B10"`), `rules` 는 `ConditionalRule[]`.
    - 근거: 사용자 답변 (2026-05-09)
  - **AC**: 적용 단위는 위 `ref` 문자열로 셀·범위 모두 표현(별도 분기 X).
    - 근거: 사용자 답변 (2026-05-09) — Q1 해소로 자동 결정
  - **AC**: 강조 서식은 `{ background?: string; fontColor?: string; fontWeight?: "bold" | "normal" }` 형태로 표현한다. `background`/`fontColor` 는 기존 정적 스타일과 동일한 ARGB 8자리(`"00FF0000"`).
    - 근거: 사용자 답변 (2026-05-09)
  - **AC**: 정적 서식과 조건부 서식의 합성은 Excel 의 native CF 오버레이 동작에 맡긴다(view 시점에 `dxfId` 가 base format 위에 필드 단위로 덮임). 빌더는 정적 스타일과 CF 규칙을 각각 OOXML 에 emit 하며 별도 합성 로직을 수행하지 않는다.
    - 근거: 사용자 답변 (2026-05-09) — Excel CF 동작에 위임

- [ ] Story 2: 빌더 코드 작성자가 두 값 사이 구간 강조를 위해 `between` 연산자 기반 cellIs 규칙을 셀/범위에 적용한다.
  > [2026-05-08, paste] "`<`, `>`, `<=`, `>=`, `=`, `<>`, `between`"
  > 출처: source.md "기대 동작"

  - **AC**: cellIs 규칙 타입은 discriminated union 으로 정의해 op 별 `value` 타입이 자동 추론된다.
    ```ts
    | { type: "cellIs"; op: "<" | ">" | "<=" | ">=" | "=" | "<>"; value: number | string; style: ... }
    | { type: "cellIs"; op: "between" | "notBetween"; value: [number, number] | [string, string]; style: ... }
    ```
    - 근거: 사용자 답변 (2026-05-09)
  - **AC**: `between` 경계는 OOXML 표준에 따라 양 끝 inclusive. `notBetween` op 도 함께 지원한다.
    - 근거: 사용자 답변 (2026-05-09) / OOXML CFOperator 표준
  - **AC**: `value` 가 `number` 면 빌더가 raw formula 로 그대로 emit (`<formula>4999</formula>`). `string` 이면 빌더가 따옴표로 감싸 문자열 리터럴 formula 로 emit (`value: "OK"` → `<formula>"OK"</formula>`). raw formula 표현력이 필요한 케이스는 TASK-003 임의 expression 규칙을 사용한다.
    - 근거: 사용자 답변 (2026-05-09)

- [ ] Story 3: 빌더 코드 작성자가 한 셀에 여러 비교 규칙(예: `<4999` 노랑, `<1000` 빨강)을 동시 적용해 다단계 강조를 표현한다.
  > [2026-05-08, paste] "셀 값에 따라 서식을 분기하는 조건부 서식(예: 값 `< 4999` 일 때 노란 배경)"
  > 출처: source.md "발생 현상"

  - **AC**: `rules` 배열의 선언 순서가 priority 순서(앞이 우선). OOXML `<cfRule priority="...">` 은 배열 인덱스를 기준으로 빌더가 자동 부여한다. `stopIfTrue` 는 노출하지 않으며 Excel 의 native 누적 동작에 맡긴다.
    - 근거: 사용자 답변 (2026-05-09)

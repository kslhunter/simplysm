# TASK-002-텍스트포함규칙

## 메타
- Activity: A1. 조건부 강조 규칙 적용
- specified: 2026-05-09

## 요약
빌더 코드 작성자가 셀 값의 텍스트 매칭 결과에 따라 강조 서식을 부여하기 위해 텍스트 기반 조건부 서식 규칙(`containsText` 계열 4종)을 셀/범위에 적용한다.

## Stories

- [ ] Story 1: 빌더 코드 작성자가 키워드 매칭 행/셀 강조를 위해 텍스트 매칭 규칙(포함/미포함/시작/끝)을 셀/범위에 적용한다.
  > [2026-05-08, paste] "`containsText`: `NOT(ISERROR(SEARCH(\"...\", A1)))`"
  > 출처: source.md "기대 동작"

  - **AC**: `type: "text"` 규칙은 OOXML cfRule 표준 4종을 노출한다.
    ```ts
    | { type: "text"; op: "contains" | "notContains" | "beginsWith" | "endsWith"; value: string; style: ... }
    ```
    빌더는 op 별로 OOXML `type` 속성(`containsText`/`notContainsText`/`beginsWith`/`endsWith`) 과 대응 formula 를 emit 한다.
    - 근거: 사용자 답변 (2026-05-09) / OOXML CFType 표준
  - **AC**: 매칭은 `SEARCH` 기반(대소문자 무시) 고정. case-sensitive 매칭이 필요한 경우는 TASK-003 임의 expression 규칙으로 처리.
    - 근거: 사용자 답변 (2026-05-09)
  - **AC**: 적용 단위는 TASK-001 의 `ref` 문자열 정의를 공유.
    - 근거: TASK-001 Story 1 AC

- [ ] Story 2: 빌더 코드 작성자가 강조 서식(background / font color / font weight)을 텍스트 매칭 규칙에 부여한다.
  > [2026-05-08, paste] "규칙당 적용 서식: 최소 background / font color / font weight."
  > 출처: source.md "기대 동작"

  - **AC**: 강조 서식은 TASK-001 Story 1 의 `{ background?, fontColor?, fontWeight? }` 형식을 공유.
    - 근거: TASK-001 Story 1 AC

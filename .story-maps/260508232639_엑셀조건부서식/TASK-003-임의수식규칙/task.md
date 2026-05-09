# TASK-003-임의수식규칙

## 메타
- Activity: A1. 조건부 강조 규칙 적용
- specified: 2026-05-09

## 요약
빌더 코드 작성자가 cellIs/containsText 로 표현할 수 없는 복합 조건 강조를 위해 임의 Excel expression 결과 기반 조건부 서식 규칙을 셀/범위에 적용한다.

## Stories

- [ ] Story 1: 빌더 코드 작성자가 다중 컬럼 비교·날짜 임박 등 복합 조건 강조를 위해 임의 expression formula 규칙을 셀/범위에 적용한다.
  > [2026-05-08, paste] "임의 expression formula"
  > 출처: source.md "기대 동작"
  > 사용 사례: AD-TEK RTP 마스터 워크북 INTERNAL Back log(List) 시트의 PSD/ETA 임박 강조

  - **AC**: expression 규칙 타입은 다음과 같이 정의된다.
    ```ts
    | { type: "expression"; formula: string; style: ... }
    ```
    빌더는 OOXML `<cfRule type="expression">` 으로 emit.
    - 근거: TASK-001/002 의 ConditionalRule discriminated union 패턴 / OOXML CFType 표준
  - **AC**: 사용자 formula 는 빌더가 raw 그대로 OOXML `<formula>` 에 emit. anchor 셀은 `ref` 의 top-left 이며, 범위 적용 시 다른 셀은 Excel native 의 상대 참조 시프트 동작에 따른다. 절대(`$A$1`)/상대(`A1`) 표기는 사용자 책임.
    - 근거: 사용자 답변 (2026-05-09) / OOXML expression cfRule 표준
  - **AC**: 빌더는 formula 의 syntax 검증을 수행하지 않고 raw 그대로 emit 한다. 잘못된 formula 는 Excel 에서 파일 열 때 오류로 노출된다(사용자 책임).
    - 근거: 사용자 답변 (2026-05-09)
  - **AC**: 강조 서식은 TASK-001 Story 1 의 `{ background?, fontColor?, fontWeight? }` 형식을 공유.
    - 근거: TASK-001 Story 1 AC

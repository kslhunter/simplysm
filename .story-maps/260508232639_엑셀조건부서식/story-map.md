# Story Map 260508232639_엑셀조건부서식

## 메타
- 생성일: 2026-05-08 23:26
- Requirement Source: .story-maps/260508232639_엑셀조건부서식/source.md

## Frame
- Persona: `@simplysm/excel` 빌더 코드 작성자
- Outcome: 셀 값에 따라 분기되는 조건부 강조 서식을 코드만으로 워크북에 적용한다

## Backbone

| # | Activity | Outcome |
|---|---|---|
| A1 | 조건부 강조 규칙 적용 | 규칙 타입별로 셀/범위에 강조 서식을 부여한다 |

## Walking Skeleton

### A1. 조건부 강조 규칙 적용

| 순서 | Task | 한 줄 요약 |
|---|---|---|
| 1 | TASK-001-셀값비교규칙 | 비교 연산자(`<`/`>`/`<=`/`>=`/`=`/`<>`/`between`) 기반 강조 |
| 2 | TASK-002-텍스트포함규칙 | 셀 값에 특정 텍스트 포함 시 강조 |
| 3 | TASK-003-임의수식규칙 | 임의 Excel expression 평가 결과 기반 강조 |

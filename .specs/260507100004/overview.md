# Session 260507100004

## 메타
- 생성일: 2026-05-07 10:00
- raw input 출처: 채팅 (issue #31 + 사용자 진단 + 사전조사 결과). 일자: 2026-05-07
- 입력 모드: Direct

## 요약
`Queryable.select` 결과 메타에 raw 상수(string/number/boolean/Date 등)가 `ExprUnit` 으로 감싸지지 않은 채 저장되어, 그 컬럼을 표현식 자리(orderBy/groupBy 등)에 다시 끌어쓰면 IR 에 `undefined` 가 박혀 TypeError 가 나는 결함을 고친다. SQL 출력은 동일해야 한다.

## REQ 목록
- REQ-001-select메타-리터럴-ExprUnit화: select callback 결과 메타와 transformColumnsAlias 의 raw 상수 분기를 `ExprUnit` 으로 감싸 표현식 자리에서 안전하게 재사용 가능하게 한다.

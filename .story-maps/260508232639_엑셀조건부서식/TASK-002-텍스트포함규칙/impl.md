# TASK-002-텍스트포함규칙 Implementation

## 메타
- implemented: 2026-05-09

## 구현 결과

- Story 1 (텍스트 매칭 4종):
  - 변경 파일:
    - `packages/excel/src/types.ts`: `ExcelConditionalRule` 에 `type: "text"` variant 추가(`op: "contains" | "notContains" | "beginsWith" | "endsWith"`, `value: string`). `ExcelXmlCfRuleData.$.type` literal 에 `containsText`/`notContainsText`/`beginsWith`/`endsWith` 추가, `$.operator` 에 `containsText`/`notContains`/`beginsWith`/`endsWith` 추가, `$.text?: string` 옵션 속성 추가.
    - `packages/excel/src/xml/excel-xml-worksheet.ts`: `addConditionalFormatting` 의 cfRule push 시 `text` 가 있으면 `$.text` 로 emit(spread + 조건부 포함).
    - `packages/excel/src/excel-worksheet.ts`: `_mapCfOperator`/`_encodeCfFormula` 두 헬퍼를 단일 `_buildCfRuleSpec(rule, topLeft)` 로 통합. text variant 의 op 4종에 대해 OOXML cfRule type/operator/text/formula 4-튜플을 한꺼번에 산출. `addConditionalFormat` 진입부에서 `opts.ref.split(":")[0]` 로 topLeft 추출 후 헬퍼에 전달.
  - design 대비 차이: 없음.
  - 이슈/결정: 기존 `_mapCfOperator`+`_encodeCfFormula` 분리 구조에서는 type 변경(cellIs↔text)·formula 의 topLeft 의존이 두 헬퍼에 걸쳐 흩어져서 통합. cellIs 측 동작은 동일.

- Story 2 (강조 서식 부여):
  - 변경 파일: 없음(추가 구현 불필요).
  - design 대비 차이: 없음. `style` 은 TASK-001 의 `ExcelConditionalRuleStyle` 을 그대로 사용. `addDxf` 가 그대로 재사용되며 dedupe 도 정상 동작.

## 패키지 레벨 검증

- `pnpm check --fix -t excel`: typecheck 0 에러, lint 0 에러.
- `pnpm exec vitest run --project node packages/excel/tests/`: 13 파일 / 174 테스트 모두 통과(TASK-001 회귀 없음, 신규 14 테스트 포함).
- 신규 테스트(`packages/excel/tests/conditional-format.spec.ts` 의 `텍스트 매칭 (TASK-002)` describe + Roundtrip 추가 케이스):
  - 4 op → cfRule type/operator 매핑 검증.
  - 4 op formula 정확 매칭(NOT(ISERROR(SEARCH))/ISERROR(SEARCH)/LEFT=/RIGHT=).
  - topLeft 추출(단일 셀과 범위 모두).
  - value 큰따옴표 OOXML escape(`a"b` → text="a\"b" + formula 내 `"a""b"`).
  - dxf 등록·연결, 같은 style dedupe.
  - cellIs 와 text 혼용 시 시트 전역 priority 카운터 1·2·3 이어붙음.
  - Roundtrip(`toBytes` → 재생성 후 type/operator/text/formula/dxf 모두 보존).

## 정방향 검토

- story-map.md TASK-002 한 줄 요약(`셀 값에 특정 텍스트 포함 시 강조`) → contains/notContains/beginsWith/endsWith 4종 모두 구현.
- task.md AC 전체 매핑 확인:
  - `type: "text"` discriminated union variant ✓
  - op 4종 → OOXML cfRule `type` 4종 매핑 ✓
  - SEARCH 기반(대소문자 무시) 고정 ✓ — contains/notContains 가 `SEARCH` 사용, beginsWith/endsWith 는 `LEFT`/`RIGHT` + 동등 비교(Excel 의 `=` 문자열 비교가 case-insensitive 라 결과 동일).
  - case-sensitive 미구현(TASK-003 위임 명시) ✓
  - `ref` 문자열 정의 TASK-001 공유 ✓
  - `style` 형식 TASK-001 공유 ✓
- design.md 결정사항 일치: topLeft 상대 참조 / `text` 속성 + `<formula>` 동시 emit ✓.
- 변질·누락 없음.

## 안내

본 Task 는 빌더 코드 작성자(개발자)가 소비자 — UI 시연 대상이 아님. 워크플로 완료. TASK-003(임의 expression) 은 본 Task 와 TASK-001 인프라(`addConditionalFormat`/`dxfs`/`cfRule emit`)를 그대로 재사용 가능.

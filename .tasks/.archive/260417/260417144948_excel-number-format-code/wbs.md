# WBS: @simplysm/excel 커스텀 Excel formatCode 지원 추가

## 프로젝트 개요

- **배경:** v12의 `@simplysm/excel`에는 `cell.style.setNumFormatCodeAsync("0.000000")` 형태로 임의의 Excel formatCode 문자열(소수점 자리수, 통화, 퍼센트 등)을 셀에 지정하는 API가 있었다. v14에는 해당 기능이 누락되어, `ExcelStyleOptions.numberFormat`이 `"number" | "string" | "DateOnly" | "DateTime" | "Time"` 프리셋 리터럴만 허용한다. 소비앱에서 소수점 정밀도 지정 등 실무 필수 시나리오를 처리할 수 없어 마이그레이션 블로커가 된다.
- **환경:** `@simplysm/excel` v14 (pnpm 모노레포 `packages/excel`). DOM 비의존 neutral 패키지. Node.js와 브라우저 양쪽에서 동작.
- **전제조건:** 없음. 내부 구현(`_setNumFmtCode`)이 이미 존재하므로 퍼블릭 API 노출만 필요하다.
- **기술적 제약:**
  - 사용자 결정에 따라 `setStyle` 중심의 v14 선언적 스타일 설정 패턴을 유지한다 (v12식 체이닝 재도입 금지).
  - 기존 `numberFormat: ExcelNumberFormat` 타입과 시맨틱은 그대로 유지한다 (하위 호환).
  - 기존 프리셋(`"number"`, `"DateOnly"` 등)과 커스텀 formatCode는 **타입 레벨에서 분리**한다.
- **참조 자료:**
  - `packages/excel/src/types.ts:79~94` — `ExcelStyleOptions` 인터페이스 (확장 대상)
  - `packages/excel/src/xml/excel-xml-style.ts:284` — `private _setNumFmtCode(numFmtCode: string)` (재사용 대상)
  - `packages/excel/src/xml/excel-xml-style.ts` — `setStyle` 적용 로직 전반 (분기 추가 대상)
  - `packages/excel/tests/excel-cell.spec.ts` — 스타일 관련 기존 테스트 (작성 패턴 참조)
  - `.claude/references/sd-simplysm14/excel/docs/types.md` — 사용법 문서 (업데이트 대상)
  - `.claude/references/sd-simplysm14/excel/docs/core-classes.md` — 스타일 예제 (업데이트 대상)
  - `packages/excel/CLAUDE.md` — 패키지 구조·테스트 배치 규칙 확인용
  - `.claude/references/sd-testing.md` — 테스트 작성 규칙 확인용

## Impact Mapping

- **Goal:** v14로 마이그레이션하거나 새로 개발하는 소비앱에서 임의의 Excel formatCode를 셀에 적용 가능하게 하여, 숫자 포맷 관련 v12→v14 마이그레이션 블로커를 **0건**으로 만든다.
  - **Actor:** `@simplysm/excel`을 사용하는 소비앱 개발자
    - **Impact:** 소수점 자리수(`"0.000000"`), 통화(`"#,##0"`), 퍼센트(`"0.00%"`) 등 커스텀 Excel formatCode를 `setStyle` 한 번으로 선언적으로 지정한다.
      - **Deliverable:**
        - `ExcelStyleOptions.numberFormatCode?: string` 타입 확장
        - `setStyle`에서 커스텀 formatCode를 styles.xml에 등록·적용하는 로직
        - 쓰기/읽기 왕복 테스트
        - `docs/types.md`, `docs/core-classes.md` 사용법·예제 추가

## Feature Breakdown

### Epic 1. 커스텀 숫자 포맷 지원

#### [x] Feature 1.1 `ExcelStyleOptions.numberFormatCode` 추가

**의존성:** 없음

**범위:**

- `packages/excel/src/types.ts`의 `ExcelStyleOptions` 인터페이스에 `numberFormatCode?: string` 필드 추가 (기존 `numberFormat?: ExcelNumberFormat` 필드는 그대로 유지)
- `packages/excel/src/xml/excel-xml-style.ts`의 `setStyle` 적용부에서 `numberFormatCode` 분기 추가:
  - `numberFormatCode`가 지정된 경우 기존 `_setNumFmtCode(numFmtCode)` private 메서드를 재사용해 styles.xml에 등록하고 반환된 numFmtId를 cellXf에 반영
  - `numberFormatCode`와 `numberFormat`이 동시에 지정된 경우 **`numberFormatCode`(커스텀) 우선** 적용
  - `numberFormat`만 지정된 경우 기존 동작 유지
- 쓰기 테스트: `setStyle({ numberFormatCode: "0.000000" })` 지정 후 toBytes → 재로드 시 해당 셀의 스타일(numFmtId 및 formatCode)이 보존되는지 검증
- 프리셋/커스텀 공존 테스트: 동일 셀에 `numberFormat: "number"`와 `numberFormatCode: "0.000000"`을 동시 지정했을 때 커스텀이 우선 적용되는지 검증
- 멀티 formatCode 테스트: 한 워크북 내 서로 다른 formatCode(`"0.000000"`, `"#,##0.00"`, `"0.00%"` 등)를 여러 셀에 적용했을 때 각각 독립된 numFmtId로 등록되고 올바르게 적용되는지 검증
- 참조 문서 업데이트:
  - `.claude/references/sd-simplysm14/excel/docs/types.md`의 `ExcelStyleOptions` 표에 `numberFormatCode` 필드 추가 및 동시 지정 시 우선순위 규칙 명시
  - `.claude/references/sd-simplysm14/excel/docs/core-classes.md`의 `setStyle` 예제에 `numberFormatCode` 사용 예 추가

**경계:**

- `ExcelCell`에 별도 전용 메서드(`setNumberFormatCode` 등)는 추가하지 않는다 — `setStyle` 경로로만 노출한다
- `ExcelNumberFormat` 리터럴 타입에 새 프리셋을 추가하지 않는다 (순수 추가 필드로만 해결)
- v12식 체이닝 API(`cell.style.setX`)는 재도입하지 않는다
- `ExcelWrapper`(Zod 기반 래퍼) 쪽 인터페이스 확장은 이번 Feature 범위 밖 — 필요 시 후속 Feature로 분리
- 읽기 측 `getValue()` 변경은 하지 않는다 — 커스텀 numFmtId가 있는 숫자 셀은 기존 동작대로 `number`로 반환된다 (DateOnly/DateTime/Time 매핑 외의 numFmtId는 number fallback)
- 입력된 formatCode 문자열의 Excel 문법 유효성 검사는 하지 않는다 (Excel이 해석; 잘못된 문자열은 Excel 쪽 오류로 드러남)

**근거:**

- 요구사항 원문: 사용자 질문 — "v12엔 `await ws.cell(r, 15).style.setNumFormatCodeAsync("0.000000")` 이런 식의 포맷코드가 지원됐는데 v14에선 지원 안 되나?"
- 사용자 결정(AskUserQuestion 응답): 옵션 B — `numberFormatCode?: string` 별도 필드 추가, 동시 지정 시 커스텀 우선
- 코드 확인: `packages/excel/src/xml/excel-xml-style.ts:284~321`의 `_setNumFmtCode(numFmtCode: string): string` private 메서드가 styles.xml에 커스텀 formatCode를 등록하고 numFmtId를 반환하는 로직을 이미 구현 중(현재는 `DateOnly`/`DateTime`/`Time` 프리셋 내부 처리에만 사용됨) → 신규 노출은 이 메서드의 호출 경로만 추가하면 됨
- **sd-plan 단계 추가 확인:** 하위 레벨 `ExcelStyle` 내부 타입(`excel-xml-style.ts:14~21`)에는 이미 `numFmtCode?: string` 필드가 존재하고, `add()`(`:71~106`)와 `addWithClone()`(`:108~185`)에서 해당 필드를 처리하는 로직이 완성되어 있다. 코드 순서상 `numFmtCode`가 `numFmtId`를 덮어쓰므로 **커스텀 우선 우선순위도 하위 레벨에서 이미 구현됨**. 따라서 실질 변경은 퍼블릭 타입 확장 1건 + `ExcelCell.setStyle` 매핑 3줄 수정 + 테스트 + 문서로 국한되어 단일 Slice로 충분하다.
- 확인 목적(참조 파일):
  - `packages/excel/src/xml/excel-xml-style.ts`: `setStyle` 내부에서 프리셋 `numberFormat`을 처리하는 위치를 파악해 `numberFormatCode` 분기를 삽입할 정확한 지점 결정
  - `packages/excel/tests/excel-cell.spec.ts`: 기존 스타일 관련 테스트가 사용하는 검증 패턴(toBytes → 재로드 → getStyleId → styleSheet 조회) 답습
  - `packages/excel/CLAUDE.md`: Vitest + `tests/` 평탄 배치, Node/브라우저 양쪽 호환 규칙 준수
  - `.claude/references/sd-testing.md`: 공통 테스트 작성 지침 확인

## 의존성 매트릭스

| Feature | 의존 대상 | 필요 산출물 |
| ------- | --------- | ----------- |
| 1.1     | 없음      | -           |

- **누락 검증:** 단일 Feature이므로 외부 산출물 의존 없음. 내부 `_setNumFmtCode`는 동일 Feature 범위 내 재사용이므로 별도 의존성으로 간주하지 않음.
- **순환 검증:** 단일 노드 — 순환 없음.
- **1단계 존재 확인:** Feature 1.1이 의존성 없음 — 충족.

## 제외 사항

- **v12식 체이닝 API 재도입** (`cell.style.setNumFormatCodeAsync(...)`) — 사용자 명시적 제외. v14는 `setStyle({...})` 선언형 패턴을 채택함
- **`ExcelNumberFormat` 프리셋 리터럴 확장** — 사용자 명시적 제외. 커스텀 formatCode는 별도 필드로만 노출
- **`ExcelCell.setNumberFormatCode(code)` 전용 메서드** — 사용자 명시적 제외. `setStyle` 경로로만 노출
- **`ExcelWrapper`의 스키마 기반 커스텀 formatCode 매핑** — 범위 초과. 현재 Feature는 저수준 `setStyle` API만 다룸. 필요 시 후속 Feature로 분리
- **입력 formatCode의 Excel 문법 유효성 검증** — 범위 초과. 잘못된 formatCode는 Excel이 보고함
- **읽기 측(`getValue`)에서 커스텀 numFmtId에 기반한 신규 값 타입 매핑** — 범위 초과. 기존 number fallback 동작 유지

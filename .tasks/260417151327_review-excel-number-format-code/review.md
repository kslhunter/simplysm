# 코드 리뷰: excel-number-format-code

## 대상

- 계획: `.tasks/260417144948_excel-number-format-code/wbs.md`, `.tasks/260417144948_excel-number-format-code/1.1-add-number-format-code.md`
- 구현:
  - `packages/excel/src/types.ts` — `ExcelStyleOptions.numberFormatCode` 추가
  - `packages/excel/src/excel-cell.ts:227~266` — `setStyle` 매핑 `else if` 분기 및 JSDoc
  - `packages/excel/tests/excel-cell.spec.ts` — T1~T6
  - `.claude/references/sd-simplysm14/excel/docs/types.md`
  - `.claude/references/sd-simplysm14/excel/docs/core-classes.md`

## 종합 판단

- 계획(WBS/Feature 1.1) 대비 **필수 산출물은 모두 이행됨**: 타입 확장, `setStyle` 분기, 테스트 6건, 문서 2건.
- 하위 레이어(`ExcelStyle.numFmtCode` 필드, `add/addWithClone` 처리, `_setNumFmtCode` 중복 검사·180+ 할당)는 기존 코드에 이미 존재하여 **매핑 확장만으로 의도한 동작이 성립**한다 — 구현 범위가 좁다는 Feature 문서의 판단이 유효함.
- `else if` 분기(`excel-cell.ts:259~263`)로 `ExcelStyle`에 `numFmtId`·`numFmtCode` 공존 방지 — 설계 결정 D3와 일치.
- **Critical/Medium 이슈 없음**. 이하 Low 이슈 4건.

---

## LOGIC-001 [Low] 커스텀 formatCode가 `getValue()`에서 분류 실패 시 예외 발생 가능

- **위치:** `packages/excel/src/excel-cell.ts:156~168`, `packages/excel/src/utils/excel-utils.ts:116~145`

Feature 1.1의 비목표(구현계획 "비목표" 4번)에 `getValue()` 로직 변경을 하지 않는다고 명시하고, WBS에는 "기존 number fallback 동작 유지"라고 기술되어 있다. 그러나 실제 `getValue()`는 `styleData.getNumFmtCode(numFmtId)`가 값을 반환하면 **무조건** `ExcelUtils.convertNumFmtCodeToName(numFmtCode)`를 호출하는 구조이다 (`excel-cell.ts:156~159`). 해당 유틸은 Excel 내장 패턴에 매칭되지 않는 문자열(예: `"Korean Won ₩#,##0"`)에 대해 `throw new Error(\`알 수 없는 형식 [numFmtCode: ${numFmtCode}]\`)`를 던진다 (`excel-utils.ts:143`).

즉 사용자가 정규식·날짜 패턴 어디에도 매칭되지 않는 커스텀 formatCode를 지정하면, 같은 셀에 대한 `setValue → getValue` 왕복이 실패한다.

본 Feature의 명시적 scope 밖이긴 하나, WBS의 "number fallback 동작 유지"는 기술상 부정확하다 — 실제 동작은 "분류 가능한 패턴이면 해당 타입, 실패 시 throw"이다. WBS 비목표·경계 문구만 살짝 보정하거나, `convertNumFmtCodeToName`에 기본값 fallback("알 수 없는 패턴 → `number`")을 도입하는 선택지가 있다.

**개선 방향:** (1) 후속 Feature로 `convertNumFmtCodeToName` 예외 → `"number"` fallback 전환을 계획하거나, (2) WBS의 "기존 number fallback 동작 유지" 문구를 "커스텀 numFmtId는 기존 `convertNumFmtCodeToName` 분류 규칙을 따른다(미매칭 시 throw)"로 수정하여 실제 동작과 정합시킨다. 단, 현 Feature 범위에서는 무수정이 타당.

---

## CONSIST-001 [Low] 테스트 T2/T3/T4/T6에 `expect(styleId).toBeDefined()` 누락

- **위치:** `packages/excel/tests/excel-cell.spec.ts` — T2(`~402`), T3(`~420`), T4(`~444`), T6(`~492`)

T1(`~390`)과 T5(`~466`)는 `const styleId = await ...getStyleId(); expect(styleId).toBeDefined();` 패턴을 사용하나, 나머지 T2/T3/T4/T6는 바로 `parseInt(styleId!, 10)`으로 non-null 가정으로 진행한다. 동작상 실패는 일어나지 않지만(`setStyle` 직후 `getStyleId`는 null을 반환하지 않음), 테스트 그룹 내 일관성 관점에서 같은 시퀀스를 쓰는 편이 가독성·디버깅성이 높다.

**개선 방향:** 각 테스트의 `getStyleId()` 직후 `expect(styleId).toBeDefined()` 한 줄을 추가해 T1·T5와 통일한다.

---

## CONSIST-002 [Low] Rule 2 Scenario "프리셋 DateOnly + 커스텀 yyyy-mm-dd"가 테스트로 직접 매핑되지 않음

- **위치:** `.tasks/260417144948_excel-number-format-code/1.1-add-number-format-code.md:63~65`, `packages/excel/tests/excel-cell.spec.ts` T2

Feature 문서 Rule 2에는 두 Scenario가 있다.

1. `{ numberFormat: "number", numberFormatCode: "0.000000" }` → `"0.000000"` 우선
2. `{ numberFormat: "DateOnly", numberFormatCode: "yyyy-mm-dd hh:mm" }` → `"yyyy-mm-dd hh:mm"` 우선

실제 구현된 T2(`spec.ts:393~407`)는 Scenario 1만 검증한다. `else if` 분기 구조상 두 Scenario의 동작이 동일하므로 커버리지는 확보되나, 문서-테스트 1:1 매핑은 깨진다.

**개선 방향:** T2에 `DateOnly + "yyyy-mm-dd hh:mm"` 조합 assertion을 추가하거나, Feature 문서에서 Scenario 2를 Scenario 1로 흡수하여 일관성을 맞춘다.

---

## DESIGN-001 [Low] T6에서 `applyNumberFormat="1"` 미검증

- **위치:** `packages/excel/tests/excel-cell.spec.ts` T6(`~492`), `packages/excel/src/xml/excel-xml-style.ts:124~127`

Rule 1 Scenario의 검증 포인트 중 하나가 "`xf의 applyNumberFormat이 '1'이다`"이며, T1에서 이를 체크한다. 그러나 T6("기존 스타일에 커스텀 formatCode 추가 시 기존 속성 보존")은 `addWithClone` 경로를 지나는 유일한 테스트임에도 `applyNumberFormat` 체크가 없다. `addWithClone`은 `add`와 별도 경로(`excel-xml-style.ts:124~127`)에서 `applyNumberFormat="1"`을 설정하므로, 회귀 방지를 위해 이 경로도 직접 검증하는 편이 안전하다.

**개선 방향:** T6에 `expect(xf.$.applyNumberFormat).toBe("1")` 한 줄 추가.

---

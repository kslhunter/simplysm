# TASK-001-폰트스타일

## 메타
- Activity: A1. 폰트 스타일 적용
- specified: 2026-05-09

## 요약
개발자가 워크북 전반에 일관된 폰트 베이스를 깔고 강조 셀만 다른 폰트로 표시하기 위해, 워크북 default 와 셀 override 두 진입점으로 폰트(size/family/bold/italic/underline/color/strike)를 지정한다.

## Stories

- [ ] Story 1: 개발자가 셀마다 `setStyle` 을 반복하지 않고 워크북 전체 공통 폰트를 적용하기 위해, 워크북 빌드 시 default 폰트(size/family/bold)를 한 번에 지정한다.
  > [2026-05-09, GitHub issue #33] "Workbook default 폰트 — 모든 셀의 공통 폰트 지정. 매 셀마다 setStyle 박지 않고 한 번에 설정. `xl/styles.xml` 의 `fonts[0]` 에 해당."
  > 출처: ../source.md

  - **AC**: default 폰트는 workbook 단위 1곳만 지원한다. OOXML `xl/styles.xml` 의 `fonts[0]` (= `cellXfs[0]` 이 참조) 으로 emit. sheet 단위 default 는 도입하지 않는다. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) — OOXML 스펙상 시트별 default font 표현 수단이 없어 시뮬레이션 비용이 큼. 이슈 본문도 workbook default 만 명시.
  - **AC**: default 폰트 미지정 시 라이브러리는 `fonts[0]` 을 건드리지 않는다. 새 워크북이면 현행대로 빈 `<font/>` 가 emit 되어 Excel 자체 기본(Calibri 11pt) 으로 표시되고, 기존 파일 read 시에는 원본 `fonts[0]` 이 그대로 보존된다. 라이브러리 자체 기본값(맑은 고딕 등) 을 강제하지 않는다. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) — 기존 파일 read 시 원본 폰트 보존이 필수. + `packages/excel/src/xml/excel-xml-style.ts:39-44` 동일 패턴 (빈 font 초기화).
  - **AC**: workbook default 진입점은 `wb.setDefaultStyle(opts: ExcelStyleOptions): Promise<void>`. 폰트 전용 표면이 아니라 `ExcelStyleOptions` 전체를 받아 cellXfs[0] (OOXML default cell style 자리) 에 새 xf 를 빌드해 덮어쓴다. 폰트 외 필드(background/border/horizontalAlign/verticalAlign/numberFormat/numberFormatCode) 도 동일 빌더로 default 처리된다. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) "wb.setDefaultStyle({font: ...}) 여야". OOXML cellXfs[0] 의 default cell style 의미 + cell.setStyle 표면(ExcelStyleOptions) 과의 어휘 일관.

- [ ] Story 2: 개발자가 강조 셀을 다른 폰트로 표시하기 위해, `cell.setStyle(...)` 의 `ExcelStyleOptions` 에서 폰트(size/family/bold)를 지정한다.
  > [2026-05-09, GitHub issue #33] "Cell 스타일 override — 특정 셀의 폰트만 변경. `ExcelStyleOptions` 에 `fontSize / fontFamily / fontBold` (또는 묶음 `font: { size, family, bold }`) 추가."
  > 출처: ../source.md

  - **AC**: 워크북 default 와 셀 override 사이의 우선순위 머지는 라이브러리가 다루지 않는다. 셀에 폰트 override 가 지정되면 그 속성으로 새 `fonts` 항목을 만들어 셀 `cellXf.fontId` 가 가리키게 하고, 지정 없으면 셀은 default(`fonts[0]`) 를 그대로 사용한다. 표시 결과는 Excel 자체 동작에 맡긴다. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) "스타일 먹이면 cell 스타일, 안 먹이면 default. 그건 엑셀이 할 일."
  - **AC**: 셀 폰트 override API 는 nested 형태. `ExcelStyleOptions.font: { size?, family?, bold?, italic?, underline?, color?, strike? }`. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) — 폰트 7개 속성을 한 단위로 묶기 위해 nested 채택.

- [ ] Story 3 (공통): 개발자가 두 진입점을 같은 표면 어휘로 다루기 위해, default 와 override 가 동일한 폰트 속성 셋을 공유한다.
  > 출처: ../source.md (이슈 본문이 두 경로 모두 size/family/bold 로 동일하게 명시)

  - **AC**: 지원 폰트 속성 범위는 `size / family / bold / italic / underline / color / strike` 7개로 한다. default 와 override 양쪽 동일 셋을 지원한다. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) — 이슈는 size/family/bold 만 명시했으나 사용자 결정으로 Excel `<font>` 엘리먼트 표면을 폭넓게 포괄.
  - **AC**: `ExcelConditionalRuleStyle` (조건부 서식) 의 폰트 항목 확장과 일반 셀 폰트 표면의 싱크는 본 스코프 밖. 조건부 서식 쪽은 현재 `fontColor / fontWeight` 그대로 두고 본 작업에서 건드리지 않는다. 표면 통일은 후속 작업으로 미룬다. (2026-05-09)
    - 근거: 사용자 답변 (2026-05-09) "둘사이에 싱크맞추기는 나중에 감안. 지금은 아님."

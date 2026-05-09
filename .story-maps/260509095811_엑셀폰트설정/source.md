# Requirement Source

- 출처: GitHub issue #33 (kslhunter, 2026-05-09)
- URL: https://github.com/kslhunter/simplysm/issues/33

## 원문

제목: 폰트(size/family/bold) 설정 — cell 스타일 + workbook default 모두 추가

### 발생 현상

`@simplysm/excel` 로 워크북을 만들 때 폰트(size/family/bold) 를 설정할 수단이 없다. 셀 단위 override (강조 표시) 도, 워크북 default 폰트 설정 (모든 셀의 공통 폰트) 도 둘 다 불가.

### 기대 동작

두 경로 모두 가능해야 한다 (API 분리 여부는 구현 세부):

- **Cell 스타일 override** — 특정 셀의 폰트만 변경. `ExcelStyleOptions` 에 `fontSize / fontFamily / fontBold` (또는 묶음 `font: { size, family, bold }`) 추가.
- **Workbook default 폰트** — 모든 셀의 공통 폰트 지정. 매 셀마다 setStyle 박지 않고 한 번에 설정. `xl/styles.xml` 의 `fonts[0]` 에 해당.

### 실제 동작

`ExcelStyleOptions` (`packages/excel/src/types.ts`) 는 `background`, `border`, `horizontalAlign`, `verticalAlign`, `numberFormat`, `numberFormatCode` 만 지원. `ExcelCell` / `ExcelWorkbook` 에 폰트 관련 메서드 없음. 결과적으로 빌더가 시트별 default 폰트 + 강조 셀 override 같은 일반적인 표현을 단일 코드 경로로 만들 수 없다.

### 재현 정보

- 버전: `@simplysm/excel@14.0.64`
- 환경: Node 20 / pnpm 11

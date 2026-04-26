# AGENTS.md

> 이 패키지의 사용법 및 지침은 `.codex/references/sd-simplysm-v14/excel/README.md`를 참조한다.

## Package Overview

- 패키지: `@simplysm/excel`
- 설명: xlsx 워크북을 읽고 쓰는 neutral 패키지
- 공개 진입점: `src/index.ts`
- 소스 파일 수: 18개 (`src/**/*.ts`)
- 주요 의존성: `@simplysm/core-common`, `mime`, `zod`

## Architecture

```text
src/
  index.ts                 공개 export 진입점
  excel-workbook.ts        xlsx ZIP 리소스와 워크시트 생명주기 관리
  excel-worksheet.ts       셀/행/열 접근, 데이터 테이블, 이미지, 뷰 설정
  excel-cell.ts            셀 값, 수식, 스타일, 병합 조작
  excel-row.ts             행 단위 셀 접근
  excel-col.ts             열 단위 셀 접근과 열 너비 설정
  excel-wrapper.ts         Zod 스키마 기반 typed read/write 래퍼
  types.ts                 공개 값/주소/스타일/XML 데이터 타입
  utils/
    excel-utils.ts         주소, 날짜 숫자, number format 변환 유틸
    zip-cache.ts           내부 ZIP lazy cache
  xml/
    excel-xml-*.ts         xlsx 내부 XML part별 읽기/쓰기 모델
```

공개 소비자는 `ExcelWorkbook` 또는 `ExcelWrapper`에서 시작한다. `xml/`과 `utils/zip-cache.ts`는 공개 진입점에서 직접 export하지 않는 내부 구현이다.

## Key Patterns

### Lazy XML Loading

`ExcelWorkbook`은 `ZipCache`를 통해 XML part를 접근 시점에 로드한다. 셀 값·스타일·SharedStrings 같은 대용량 XML은 해당 기능을 호출할 때 생성 또는 조회한다.

```typescript
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  const value = await ws.cell(0, 0).getValue();
} finally {
  await wb.close();
}
```

`ExcelWorkbook.close()` 호출 후에는 `getWorksheetNames()`, `addWorksheet()`, `getWorksheet()`, `toBytes()`, `toBlob()`이 에러를 던진다. 새 공개 메서드를 추가할 때도 `_ensureNotClosed()`를 먼저 호출하는 패턴을 유지한다.

### 0 기반 공개 좌표

공개 API의 행/열 좌표는 0 기반이다. xlsx XML 주소는 `ExcelUtils.stringifyAddr()`, `stringifyRowAddr()`, `stringifyColAddr()`를 통해 1 기반 Excel 주소로 변환한다.

```typescript
await ws.cell(0, 0).setValue("A1");
ExcelUtils.stringifyAddr({ r: 0, c: 0 }); // "A1"
```

새 API가 좌표를 받으면 `ExcelAddressPoint` 또는 `{ r: number; c: number }` 형태를 사용하고, 문서에 0 기반임을 명시한다.

### 값 쓰기와 날짜/시간 스타일

`ExcelCell.setValue()`와 `ExcelWorksheet.setDataMatrix()`/`setRecords()`는 같은 값 변환 규칙을 따른다.

- `string`: SharedStrings에 저장하고 셀 타입 `s` 사용
- `boolean`: 셀 타입 `b`, 값 `"1"` 또는 `"0"` 사용
- `number`: 셀 타입 제거 후 숫자 문자열 저장
- `DateOnly`/`DateTime`/`Time`: Excel 날짜 숫자로 저장하고 number format 스타일 적용
- `undefined`: 셀 삭제

값 처리 로직을 확장할 때는 셀 단위 경로와 bulk write 경로를 함께 갱신한다.

### Wrapper의 Zod Header Mapping

`ExcelWrapper`는 Zod 필드의 `.description`을 Excel 헤더명으로 사용하고, description이 없으면 필드 키를 헤더명으로 사용한다. `read()`와 `write()` 모두 `options.excludes`로 필드를 제외한다.

```typescript
const wrapper = new ExcelWrapper(
  z.object({
    name: z.string().describe("이름"),
    age: z.number().describe("나이"),
  }),
);
```

`write()`가 반환하는 `ExcelWorkbook`의 리소스 관리는 호출자 책임이다. `read()` 내부에서 생성한 워크북은 메서드가 `finally`에서 닫는다.

## Testing

테스트는 `packages/excel/tests`에 있으며 Vitest `*.spec.ts` 파일을 사용한다.

- 클래스별 단위 테스트: `excel-workbook.spec.ts`, `excel-worksheet.spec.ts`, `excel-cell.spec.ts`, `excel-row.spec.ts`, `excel-col.spec.ts`
- 래퍼 테스트: `excel-wrapper.spec.ts`
- 이미지 삽입 테스트: `image-insert.spec.ts`
- 내부 XML/유틸 테스트: `xml/*`, `utils/*`
- fixture: `tests/fixtures/초기화.xlsx`, `tests/fixtures/logo.png`

출력 XML 동작을 바꾸는 경우 가장 가까운 패키지 테스트를 먼저 갱신한다. 브라우저 호환 경로 처리처럼 Node 전용 API를 피하는 구현은 기존 패턴을 유지한다.

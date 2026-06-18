# @simplysm/excel — ExcelWorkbook / ExcelWorksheet

`.xlsx` 워크북을 열거나(기존 바이트/Blob) 새로 만들고, 시트를 추가·조회하고, 시트 단위로 데이터·뷰·이미지·복사·내보내기를 다루는 핵심 클래스 군. 워크북은 내부적으로 ZIP 리소스를 lazy-load 로 관리하므로 사용 후 반드시 `close()` 로 해제해야 한다. 행/열·단일 셀 핸들은 [cell.md](./cell.md) 참조.

## ExcelWorkbook

```typescript
new ExcelWorkbook(arg?: Blob | Bytes)
```

- `arg` — 기존 Excel 파일 데이터(`Blob` 또는 `Uint8Array`/`Bytes`). 생략하면 빈 워크북을 새로 생성한다(ContentTypes/rels/workbook 기본 파트 자동 구성).
- `readonly zipCache: ZipCache` — 내부 ZIP 파트 캐시. 일반 사용에서 직접 만질 일은 없다.

### 메서드

- `getWorksheetNames(): Promise<string[]>` — 워크북의 모든 워크시트 이름을 순서대로 반환.
- `addWorksheet(name: string): Promise<ExcelWorksheet>` — 새 워크시트를 생성해 반환. ContentTypes/rels/workbook 파트를 함께 갱신한다.
- `getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>` — 이름(string) 또는 0 기반 인덱스(number)로 워크시트 조회. 못 찾으면 throw. 같은 시트를 다시 요청하면 동일 인스턴스를 캐시 반환.
- `setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` — 워크북 default cell style 설정. `styles.xml` 의 `fonts[0]`/`fills[0]`/`borders[0]`(OOXML 0번 자원 슬롯) 자체를 덮어써, fontId/fillId/borderId 를 명시하지 않은 모든 셀에 전역 적용된다. 옵션이 없는 자원 슬롯은 빈 슬롯으로 reset. 옵션 상세는 [style.md](./style.md).
- `toBytes(): Promise<Bytes>` — 워크북을 바이트 배열로 직렬화.
- `toBlob(): Promise<Blob>` — 워크북을 `.xlsx` MIME 의 `Blob` 으로 직렬화(다운로드용).
- `close(): Promise<void>` — ZIP 리더·내부 캐시 해제. 호출 후 인스턴스 사용 불가. 이미 닫힌 워크북에 호출해도 안전(no-op).

닫힌 워크북의 시트/스타일/내보내기 메서드를 호출하면 throw 된다.

### 사용 예

```typescript
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  const rows = await ws.getDataTable();
} finally {
  await wb.close();
}
```

## ExcelWorksheet

`getWorksheet`/`addWorksheet` 가 반환. 셀/행/열 접근, 데이터 일괄 입출력, 복사, 뷰, 조건부 서식, 이미지 삽입을 제공한다.

### 이름

- `getName(): Promise<string>` — 시트 이름 반환.
- `setName(newName: string): Promise<void>` — 시트 이름 변경.

### 셀·행·열 접근

- `cell(r: number, c: number): ExcelCell` — 0 기반 행/열 셀 핸들. 동일 좌표는 같은 인스턴스 캐시 반환.
- `row(r: number): ExcelRow` — 0 기반 행 핸들.
- `col(c: number): ExcelCol` — 0 기반 열 핸들.

(셀/행/열 API 상세는 [cell.md](./cell.md))

### 범위·일괄 입출력

- `getRange(): Promise<ExcelAddressRangePoint>` — 시트 데이터 범위(`{s,e}`, 양 끝 inclusive) 반환.
- `getCells(): Promise<ExcelCell[][]>` — 데이터 범위 전체를 행 우선 2차원 셀 배열로 반환.
- `getDataTable(opt?): Promise<Record<string, ExcelValueType>[]>` — 헤더 행을 키로 하는 레코드 배열 반환.
  - `opt.headerRowIndex` — 헤더 행 인덱스(기본: 데이터 범위 첫 행).
  - `opt.checkEndColIndex` — 이 열이 비면 데이터 끝으로 판단해 이후 행을 끊는다.
  - `opt.usableHeaderNameFn: (headerName: string) => boolean` — `true` 인 헤더명만 컬럼으로 채택(필터링). 중복 헤더는 throw.
- `setDataMatrix(matrix: ExcelValueType[][]): Promise<void>` — 2차원 배열을 행 우선(인덱스 0 = 첫 행)으로 기록. `undefined` 셀은 삭제.
- `setRecords(records: Record<string, ExcelValueType>[]): Promise<void>` — 레코드 배열 기록. 0 행에 키 합집합 헤더를 자동 생성하고 이후 행에 값 기록(빈 헤더 제외).

### 복사·삽입

- `copyCellStyle(srcAddr, targetAddr): Promise<void>` — 셀 스타일 ID 만 복사.
- `copyRowStyle(srcR, targetR): Promise<void>` — 데이터 범위 폭만큼 행 셀 스타일 복사.
- `copyCell(srcAddr, targetAddr): Promise<void>` — 셀 전체 복사.
- `copyRow(srcR, targetR): Promise<void>` — 원본 행을 대상 행에 복사(덮어쓰기).
- `insertCopyRow(srcR: number, targetR: number): Promise<void>` — 원본 행을 대상 위치에 삽입 복사. 대상 이하 기존 행은 한 칸 아래로 밀리고, 삽입 지점을 관통하는 다중행 병합은 1행 확장, 원본의 단일행 병합은 대상 행에 복사된다.

(`srcAddr`/`targetAddr` 는 `ExcelAddressPoint`)

### 뷰

- `setTabColor(color: string): Promise<void>` — 시트 탭 색(ARGB 8자리, 예 `"00FF0000"`).
- `setZoom(percent: number): Promise<void>` — 확대/축소 비율(퍼센트).
- `freezeAt(point: { r?: number; c?: number }): Promise<void>` — 행/열 틀 고정. `r` 만 주면 가로 틀고정, `c` 만 주면 세로 틀고정, 둘 다 주면 교차 고정.
- `setAutoFilter(range: ExcelAddressRangePoint): Promise<void>` — 헤더 자동 필터(드롭다운). 범위는 헤더행~데이터 끝 전체를 덮도록 지정. 단일 셀 범위는 단일 주소로 축약 emit.

### 조건부 서식

- `addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>` — 셀/범위에 native CF 규칙 추가. 상세는 [conditional-format.md](./conditional-format.md).

### 이미지

- `addImage(opts): Promise<void>` — 워크시트에 이미지 삽입.
  - `opts.bytes: Bytes` — 이미지 바이너리.
  - `opts.ext: string` — 확장자(`png`/`jpg` 등). MIME 결정 불가 시 throw.
  - `opts.from: { r; c; rOff?: number | string; cOff?: number | string }` — 시작 위치(0 기반 행/열, `rOff`/`cOff` 는 EMU 오프셋).
  - `opts.to?: { r; c; rOff?; cOff? }` — 끝 위치. 생략 시 `from` 의 1행 1열 아래(원본 1셀 크기)로 삽입.

### 사용 예

```typescript
const wb = new ExcelWorkbook();
const ws = await wb.addWorksheet("목록");
await ws.setRecords([{ 이름: "홍길동", 나이: 30 }]);
await ws.freezeAt({ r: 0 });
const blob = await wb.toBlob();
await wb.close();
```

## 주의사항

- 모든 워크북 I/O 는 `close()` 로 마무리할 것. 예외 경로에서도 누락되지 않게 `try/finally` 사용.
- `getDataTable`/`setRecords`/`getValue` 는 모두 결측을 `undefined` 로 보존한다(빈 셀 = `undefined`).
- 셀 좌표·범위·시트 인덱스는 전부 0 기반.

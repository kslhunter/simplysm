# @simplysm/excel — ExcelWorkbook / ExcelWorksheet

.xlsx 파일을 열거나 새로 만들고, 시트를 추가/조회하고, 시트 단위로 데이터 테이블·매트릭스·레코드 읽기·쓰기·행 복사/삽입·이미지·뷰를 다룬 뒤 바이트/Blob 로 내보내는 진입 흐름. 워크북은 내부적으로 ZIP 리소스를 잡으므로 사용 후 반드시 `close()` 해야 한다(미해제 시 리소스 누수).

## ExcelWorkbook

```typescript
new ExcelWorkbook(arg?: Blob | Bytes)
```

- `arg?: Blob | Bytes` — 기존 .xlsx 파일 데이터. 생략하면 빈 워크북을 새로 만든다(ContentTypes/rels/workbook 기본 파트 자동 구성). 파일을 읽을 땐 바이트나 Blob 을 그대로 전달.

메서드:

- `getWorksheetNames(): Promise<string[]>` — 워크북의 모든 시트 이름을 정의 순서로 반환. 시트 존재 여부·선택지를 미리 알아야 할 때.
- `addWorksheet(name: string): Promise<ExcelWorksheet>` — 새 시트를 만들어 반환. workbook/ContentTypes/rels 파트를 함께 갱신한다. 새 파일 쓰기 시작점.
- `getWorksheet(nameOrIndex: string | number): Promise<ExcelWorksheet>` — 이름(string) 또는 0 기반 인덱스(number)로 시트 조회. 없으면 throw. 같은 시트는 캐시되어 동일 인스턴스를 반환한다.
- `setDefaultStyle(opts: ExcelStyleOptions): Promise<void>` — 워크북 전역 기본 셀 스타일. `styles.xml` 의 0번 자원 슬롯(font/fill/border)을 덮어써, fontId/fillId/borderId 를 따로 지정하지 않은 모든 셀에 적용된다. 옵션 풀이는 [style.md](./style.md) 참조.
- `toBytes(): Promise<Bytes>` — 워크북을 ZIP 바이트로 직렬화. 파일 저장·서버 전송용.
- `toBlob(): Promise<Blob>` — 워크북을 `.sheet` MIME 의 Blob 으로 직렬화. 브라우저 다운로드용.
- `close(): Promise<void>` — ZIP 리더·내부 캐시 해제. 이후 인스턴스 사용 불가. 이미 닫혔으면 no-op(중복 호출 안전). 모든 작업을 `try/finally` 로 감싸 반드시 호출.
- `readonly zipCache: ZipCache` — 내부 ZIP 캐시 핸들(저수준). 일반 사용에서 직접 만질 일 없음.

읽기 예:

```typescript
const wb = new ExcelWorkbook(bytes);
try {
  const ws = await wb.getWorksheet(0);
  const rows = await ws.getDataTable();
} finally {
  await wb.close();
}
```

쓰기 예:

```typescript
const wb = new ExcelWorkbook();
try {
  await wb.setDefaultStyle({ font: { family: "맑은 고딕", size: 10 } });
  const ws = await wb.addWorksheet("결과");
  await ws.setRecords([{ 코드: "A1", 수량: 3 }]);
  return await wb.toBytes();
} finally {
  await wb.close();
}
```

## ExcelWorksheet

`wb.addWorksheet` / `wb.getWorksheet` 로만 얻는다(직접 생성 안 함). 0 기반 행/열 인덱스를 쓴다.

이름:

- `getName(): Promise<string>` — 시트 이름 반환. ID 에 대응하는 이름이 없으면 throw.
- `setName(newName: string): Promise<void>` — 시트 이름 변경.

셀 접근:

- `cell(r: number, c: number): ExcelCell` — 0 기반 행 `r`·열 `c` 의 셀 객체 반환(동기, 인스턴스 캐시). 값/스타일 실제 I/O 는 ExcelCell 의 async 메서드에서. 상세 [cell.md](./cell.md).
- `row(r: number): ExcelRow` — 0 기반 행 객체 반환.
- `col(c: number): ExcelCol` — 0 기반 열 객체 반환.

범위:

- `getRange(): Promise<ExcelAddressRangePoint>` — 시트의 데이터 범위(`{s,e}`, 양끝 inclusive) 반환. 전체 셀 순회 루프 경계로 사용.
- `getCells(): Promise<ExcelCell[][]>` — 데이터 범위 전체 셀을 행 우선 2차원 배열로 반환. 채워지는 인덱스는 range 기준(앞쪽 빈 행/열은 비어 있음).

데이터(테이블/매트릭스/레코드):

- `getDataTable(opt?): Promise<Record<string, ExcelValueType>[]>` — 헤더 행을 키로 한 레코드 배열로 읽기.
  - `opt.headerRowIndex?: number` — 헤더로 쓸 행 인덱스. 미지정 시 range 시작 행. 상단에 제목 행이 있으면 실제 헤더 행 인덱스를 지정.
  - `opt.checkEndColIndex?: number` — 데이터 끝 판정 열. 그 열 셀이 비면 이후 행을 더 읽지 않고 종료. 빈 행으로 데이터가 끊기는 양식에서 사용.
  - `opt.usableHeaderNameFn?: (headerName: string) => boolean` — 헤더 채택 필터. `true` 인 헤더만 키로 사용. 일부 열만 읽을 때. 채택된 헤더가 한 행 내 중복이면 throw.
- `setDataMatrix(matrix: ExcelValueType[][]): Promise<void>` — 2차원 배열을 0,0 부터 행 우선으로 쓰기. 헤더 없이 좌표 그대로 채울 때. `undefined` 원소는 해당 셀 삭제.
- `setRecords(records: Record<string, ExcelValueType>[]): Promise<void>` — 0행에 헤더(전 레코드 키 합집합, 빈 키 제외)를 자동 생성하고 1행부터 값 기록. 키 순서는 첫 등장 순. 표 형태 출력의 기본 수단.

뷰:

- `setTabColor(color: string): Promise<void>` — 시트 탭 색(ARGB 8자리, 예 `"00FF0000"`). 시트 구분 강조용.
- `setZoom(percent: number): Promise<void>` — 확대/축소 비율(퍼센트). 워크북 뷰를 함께 초기화한다.
- `freezeAt(point: { r?: number; c?: number }): Promise<void>` — 틀 고정. `r` = 위쪽 고정할 행 분할 지점, `c` = 왼쪽 고정할 열 분할 지점(0 기반). 헤더 한 줄 고정이면 `{ r: 0 }`(0행까지 위가 고정되고 1행부터 스크롤). 워크북 뷰를 함께 초기화한다.
- `setAutoFilter(range: ExcelAddressRangePoint): Promise<void>` — 헤더 자동 필터(드롭다운) 설정. `range`(`{s,e}`, 0 기반, 양끝 inclusive) = 필터를 거는 범위로 보통 헤더행~데이터 끝 전체를 덮는다. `getRange()` 반환값을 그대로 넘겨 표 전체에 적용할 수 있다.

조건부 서식:

- `addConditionalFormat(opts: { ref: string; rules: ExcelConditionalRule[] }): Promise<void>` — 셀/범위에 native CF 규칙 추가. 상세 [conditional-format.md](./conditional-format.md).

복사/삽입:

- `copyCellStyle(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>` — 셀 스타일 ID 만 복사(값 제외). 원본에 스타일이 없으면 무변경.
- `copyRowStyle(srcR: number, targetR: number): Promise<void>` — range 내 모든 열에 대해 행 스타일 복사.
- `copyCell(srcAddr: ExcelAddressPoint, targetAddr: ExcelAddressPoint): Promise<void>` — 셀(값+스타일)을 대상에 복사.
- `copyRow(srcR: number, targetR: number): Promise<void>` — 행 전체를 대상 행에 복사(대상 기존 내용 덮어쓰기).
- `insertCopyRow(srcR: number, targetR: number): Promise<void>` — 원본 행을 대상 위치에 "삽입" 복사. 대상 이하 기존 행은 1칸 아래로 밀리고, 삽입 지점을 관통하는 다중행 병합은 1행 확장, 원본의 단일행 병합은 대상 행에 복제된다. 템플릿 행을 반복 펼칠 때 사용(덮어쓰기 방지).

이미지:

- `addImage(opts): Promise<void>` — 시트에 이미지 삽입. 같은 시트에 여러 번 호출하면 기존 drawing 파트에 이어 붙인다.
  - `opts.bytes: Bytes` — 이미지 바이너리.
  - `opts.ext: string` — 확장자(`"png"`, `"jpg"` 등). MIME 미해석 시 throw. media 파일명/타입 결정에 사용.
  - `opts.from: { r: number; c: number; rOff?: number | string; cOff?: number | string }` — 시작 위치(0 기반 행/열, `rOff`/`cOff` 는 셀 내부 EMU 오프셋).
  - `opts.to?: { r: number; c: number; rOff?: number | string; cOff?: number | string }` — 끝 위치. 생략 시 `from` 의 한 칸 우하단(`from.r+1, from.c+1`)에 배치되어 약 1셀 크기로 들어간다. 명시하면 두 셀 앵커 사이로 늘려 배치.

데이터 읽기 예:

```typescript
const ws = await wb.getWorksheet("입력");
const rows = await ws.getDataTable({
  headerRowIndex: 1,
  checkEndColIndex: 0,
  usableHeaderNameFn: (h) => ["코드", "수량"].includes(h),
});
```

## 주의사항

- 거의 모든 셀/시트 I/O 메서드는 `async` — lazy XML 로드 때문. 반복 쓰기는 await 누적이 필요하다(`cell`/`row`/`col` 객체 획득만 동기).
- `ExcelWorkbook` 은 반드시 `close()` 해야 한다. 닫힌 워크북의 시트 조회·내보내기 메서드는 throw.
- `setRecords` 헤더는 레코드 키에서 자동 생성되므로 열 순서를 고정하려면 모든 레코드의 키 등장 순을 일정하게 유지하거나 `setDataMatrix` 를 사용.

# @simplysm/excel — ExcelCell

개별 셀의 값·수식·병합·스타일을 읽고 쓰는 클래스.

`ExcelCell` 의 모든 메서드는 `async`. 셀 값·스타일·수식은 필요할 때만 XML 파트(SharedStrings/Styles)를 로드하므로 읽을 셀을 사전에 알 수 없는 설계에서 동기 설계가 불가능.

```typescript
class ExcelCell {
  readonly addr: ExcelAddressPoint;
  getValue(): Promise<ExcelValueType>;
  setValue(val: ExcelValueType): Promise<void>;
  getFormula(): Promise<string | undefined>;
  setFormula(val: string | undefined): Promise<void>;
  merge(r: number, c: number): Promise<void>;
  getStyleId(): Promise<string | undefined>;
  setStyleId(styleId: string | undefined): Promise<void>;
  setStyle(opts: ExcelStyleOptions): Promise<void>;
}
```

**프로퍼티**

- `addr: ExcelAddressPoint` — 셀 주소(0 기반 행/열 인덱스). 읽기 전용. `{ r: number, c: number }` 형태.

**메서드**

- `getValue(): Promise<ExcelValueType>` — 셀 값 반환. 셀이 빈 경우 `undefined`. 셀 타입과 숫자 형식에 따라 다음처럼 복원:
  - `t="s"` (shared string): SharedStrings.xml 로드 후 ID로 문자열 조회.
  - `t="b"` (boolean): 값 `"1"` → true, `"0"` → false.
  - `t="str"` (수식 결과 문자열): 저장된 문자열 그대로 반환.
  - `t="n"` (숫자): `parseFloat()` 로 반환.
  - `t="inlineStr"` (inline 문자열): 저장된 텍스트 그대로 반환.
  - `t="e"` (에러): throw.
  - 타입 없고 숫자 형식 있음: numFmtId/numFmtCode 기반 DateOnly/DateTime/Time 판별 후 복원.
  - 타입·형식 없음: `parseFloat()` 로 반환.
- `setValue(val: ExcelValueType): Promise<void>` — 셀 값 설정.
  - `undefined`: 셀 삭제.
  - `string`: SharedStrings.xml 에 추가/조회 후 `t="s"` 로 저장.
  - `boolean`: `t="b"` 로 `"1"` 또는 `"0"` 저장.
  - `number`: 숫자 문자열로 저장(타입 명시 안 함).
  - `DateOnly` / `DateTime` / `Time`: Excel serial 숫자로 저장 + 해당 숫자 형식(numFmtId 14/22/18) 자동 적용.
- `getFormula(): Promise<string | undefined>` — 셀 수식 반환. 수식 없으면 `undefined`.
- `setFormula(val: string | undefined): Promise<void>` — 셀 수식 설정.
  - `undefined`: 수식 제거(셀 삭제 아님, 값 제거만).
  - `string`: 수식을 `t="str"` (수식 결과 문자열) 로 저장. Excel이 평가하는 값은 저장되지 않음 (lazy 평가).
- `merge(r: number, c: number): Promise<void>` — 현재 셀(좌상단)에서 지정된 끝 좌표(우하단)까지 셀 병합. 0 기반 행/열 인덱스. 기존 병합이 있으면 덮어쓰기.
- `getStyleId(): Promise<string | undefined>` — 셀 스타일 ID 반환. 스타일 없으면 `undefined`.
- `setStyleId(styleId: string | undefined): Promise<void>` — 셀 스타일 ID 설정.
  - `undefined`: 셀 스타일 제거.
  - `string`: `xl/styles.xml` 의 cellXfs 에 등록된 xf ID. 직접 ID 를 지정해 기존 스타일 재사용.
- `setStyle(opts: ExcelStyleOptions): Promise<void>` — 셀 스타일 설정. 옵션은 [style.md](./style.md) 참조. 기존 셀 styleId 있으면 그 기반으로 입력 옵션 merge, 없으면 새 스타일 생성.

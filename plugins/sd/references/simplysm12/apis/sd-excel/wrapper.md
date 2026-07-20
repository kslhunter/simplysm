# @simplysm/sd-excel — SdExcelWrapper

필드 스키마(키→표시명, 타입, 필수)를 정의해, 객체 배열↔엑셀 시트를 타입검증과 함께 변환하는 고수준 래퍼. 헤더는 스키마의 `displayName`, 데이터는 스키마 키 순서로 매핑됨.

## 타입

- `TValidFieldSpec<T extends Type<any>>` (내부형, 스키마 값) 의 필드:
  - `displayName: string` — 시트 헤더에 쓰는 표시명(읽기 시 헤더 매칭 기준).
  - `type: T` — 생성자(String/Number/Boolean/DateOnly/DateTime 등). 읽기 시 이 타입으로 변환.
  - `notnull?: boolean` — 필수 여부.
    - read 시 첫 notnull 필드값이 null 인 행은 skip, 전부 비면 throw.
    - 결과 타입에서 notnull=true 는 필수 프로퍼티, 아니면 옵셔널.
  - `includes?: InstanceType<T>[]` — 허용값 목록(결과 값 타입을 이 유니온으로 좁힘).
  - `hidden?: boolean` — true 면 `_getFieldConf` 단계에서 스키마에서 제거(해당 필드 제외).
- `TExcelValidObject = Record<string, TValidFieldSpec<any>>` — 스키마 전체 형태.
- `TExcelValidateObjectRecord<VT>` — 스키마로부터 추론된 레코드 타입. notnull=true 키는 필수, 나머지는 옵셔널.

## 클래스

- `new SdExcelWrapper<VT>(fieldConf: VT | (() => VT), additionalFieldConf?)`
  - `fieldConf` — 스키마 객체 또는 그것을 반환하는 함수.
  - `additionalFieldConf?: (item) => { [P in keyof VT]?: Partial<TValidFieldSpec> }` — 행(item)별로 스키마 일부를 덮어쓰는 함수(조건부 notnull/타입 등). read 시 행마다 merge 적용.

- `writeAsync(wsName: string, items: Partial<TExcelValidateObjectRecord<VT>>[]): Promise<SdExcelWorkbook>`
  - 새 워크북에 `wsName` 시트를 만들어 0행=헤더(displayName), 1행~=값(스키마 키 순서) 기록.
  - 전 데이터영역에 사방 테두리 적용, 헤더 중 `type !== Boolean && notnull` 인 칸은 배경 노랑(`00FFFF00`).
  - 줌 85%, 0행 틀고정 적용 후 워크북 반환(저장은 호출측에서 getBufferAsync 등).

- `readAsync(file: Buffer | Blob, wsNameOrIndex: string | number = 0): Promise<TExcelValidateObjectRecord<VT>[]>`
  - 파일 열어 해당 시트를 getDataTableAsync 로 읽되, 스키마 displayName 에 매칭되는 헤더만 사용.
  - 타입 변환: Boolean+notnull→null이면 false, String→toString, Number→parseInt, DateOnly/DateTime→parse, 그 외 원값.
  - 첫 notnull 필드값이 null 인 행은 skip. 결과 0건이면 throw("엑셀파일에서 데이터를 찾을 수 없습니다").
  - 마지막에 `ObjectUtils.validateArrayWithThrow` 로 스키마 검증(실패 시 throw).

## 주의

- read 시 스키마에 notnull 필드가 하나도 없으면 throw("Not Null 필드가 없습니다") — 행 skip 판정에 첫 notnull 필드를 쓰기 때문.
- `hidden: true` 필드는 read 의 변환, 검증 대상에서 빠짐.

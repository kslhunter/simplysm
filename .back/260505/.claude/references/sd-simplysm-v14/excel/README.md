# @simplysm/excel

> Excel 워크북(xlsx) 읽기/쓰기 라이브러리. DOM 의존성이 없어 Node.js와 브라우저 양쪽에서 동작하는 neutral 패키지다.
> Lazy Loading 아키텍처로 대용량 파일도 메모리 효율적으로 처리한다.
> 의존성: `@simplysm/core-common`, `mime`, `zod`

## Installation

```bash
npm install @simplysm/excel
```

## 하려는 작업 → 읽을 파일

### Excel 파일 생성·읽기·저장

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| xlsx 파일을 새로 만들거나 기존 파일을 열어 수정·저장할 때 | [ExcelWorkbook](./core-classes/excel-workbook.md) |
| Zod 스키마로 타입 안전하게 Excel 파일을 읽기/쓰기할 때 | [ExcelWrapper](./wrapper/excel-wrapper.md) |

### 셀·행·열 조작

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 개별 셀의 값·수식·스타일·병합을 설정할 때 | [ExcelCell](./core-classes/excel-cell.md) |
| 행 단위로 셀들을 일괄 접근할 때 | [ExcelRow](./core-classes/excel-row.md) |
| 열 단위로 셀들을 일괄 접근하거나 열 너비를 설정할 때 | [ExcelCol](./core-classes/excel-col.md) |
| 셀 스타일(배경색, 테두리, 정렬, 숫자 형식) 옵션을 확인할 때 | [ExcelStyleOptions](./types/excel-style-options.md) |

### 시트 데이터·레이아웃

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| 행/열 복사, 데이터 테이블 읽기/쓰기, 이미지 삽입, 뷰 설정이 필요할 때 | [ExcelWorksheet](./core-classes/excel-worksheet.md) |

### 주소·유틸리티

| 하려는 작업 | 읽을 파일 |
|-------------|-----------|
| "A1" 형식 문자열과 0 기반 좌표 간 변환이 필요할 때 | [ExcelUtils](./utilities/excel-utils.md) |
| 셀 좌표·범위 좌표 타입을 확인할 때 | [ExcelAddressPoint](./types/excel-address-point.md) |
| 셀 값의 타입(ExcelValueType, ExcelCellType)을 확인할 때 | [ExcelValueType](./types/excel-value-type.md) |

## 이 패키지를 쓰지 말아야 할 때

- xls(구형 바이너리 포맷) 파일 처리가 필요한 경우 -- xlsx만 지원한다
- CSV 파일만 처리하면 되는 경우 -- 별도 CSV 파서가 더 적합하다

---

> API 이름으로 검색: [_api-index.md](./_api-index.md)

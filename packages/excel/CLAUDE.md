# CLAUDE.md — `@simplysm/excel`

루트 `CLAUDE.md` 의 모노레포 가이드를 먼저 따른다.

## 역할

xlsx(OOXML) 워크북 read/write. **외부 xlsx 라이브러리에 의존하지 않고** 자체 XML 파서·시리얼라이저를 사용한다. 빌드 타겟 `neutral`.

진입점: `ExcelWorkbook` → `Worksheet` → `Row`/`Col`/`Cell`.

## 구조

| 경로                  | 내용                                                                                       |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `excel-workbook.ts` 외 | API 표면. `ExcelWorkbook.load(buffer)` / `.create()` 진입.                                |
| `xml/`                | OOXML 파트별 (workbook / worksheet / shared-string / style / drawing / content-type / relationship / unknown) 직렬화·파싱. **새 파트 추가는 여기**. |
| `utils/zip-cache.ts`  | `@zip.js/zip.js` 기반 zip 엔트리 캐시.                                                     |
| `utils/excel-utils.ts`| 셀 주소·열 인덱스 변환 등 공용 헬퍼.                                                       |

외부 의존: `mime`, `zod`. `@simplysm/core-common`(특히 `xml`/`zip` 유틸) 워크스페이스 의존.

## 작업 시 주의

- 셀 값 형변환은 `Cell` 의 setter/getter 가 담당. 날짜는 Excel serial → `DateTime`/`DateOnly`(core-common) 로 정규화.
- 미지원 OOXML 요소는 `excel-xml-unknown.ts` 가 원본 문자열로 보존하여 round-trip 시 손실을 최소화한다. 이 동작을 깨뜨리지 마라.
- 외부 xlsx 라이브러리 도입 금지(번들 크기·타입 불안정). 새 기능은 `xml/` 에 추가.

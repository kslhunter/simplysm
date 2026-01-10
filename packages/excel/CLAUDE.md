# excel 개발 가이드

> SIMPLYSM 프레임워크의 Excel 파일 처리 패키지 - Claude Code 참고 문서

**이 문서는 Claude Code가 excel 패키지를 개발/수정할 때 참고하는 가이드입니다.**
**프로젝트 루트의 [CLAUDE.md](../../CLAUDE.md) 함께 확인하세요.**

## 아키텍처

```
Application
    ↓
excel                    ← 현재 패키지
    ↓
core-common              (SdZip, XmlConvert, 타입들)
```

**핵심**: Excel 파일(OOXML 포맷) 읽기/쓰기. 브라우저 환경 지원.

## 모듈 구조

```
src/
├── excel-workbook.ts       # 워크북 (메인 진입점)
├── excel-worksheet.ts      # 워크시트
├── excel-cell.ts           # 셀
├── excel-row.ts            # 행
├── excel-col.ts            # 열
├── excel-wrapper.ts        # Zod 스키마 기반 타입 안전 래퍼
├── types.ts                # 타입 정의
├── utils/
│   ├── excel-utils.ts      # 유틸리티 함수
│   └── zip-cache.ts        # ZIP 캐시 + XML 파싱
└── xml/
    ├── excel-xml-content-type.ts
    ├── excel-xml-relationship.ts
    ├── excel-xml-workbook.ts
    ├── excel-xml-worksheet.ts
    ├── excel-xml-shared-string.ts
    ├── excel-xml-style.ts
    ├── excel-xml-drawing.ts
    └── excel-xml-unknown.ts
```

## 주요 클래스

| 클래스 | 역할 |
|--------|------|
| `ExcelWorkbook` | 워크북 생성/읽기/저장 (메인 진입점) |
| `ExcelWorksheet` | 시트 조작 (셀, 행, 열, 이미지) |
| `ExcelCell` | 셀 값/스타일/수식 관리 |
| `ExcelRow/Col` | 행/열 접근자 |
| `ZipCache` | ZIP 파일 캐시 + XML 파싱 |
| `ExcelWrapper` | Zod 스키마 기반 타입 안전 읽기/쓰기 래퍼 |

## 의존성

### core-common 사용

- `SdZip`: ZIP 파일 읽기/쓰기
- `XmlConvert`: XML 파싱/직렬화
- `ObjectUtils`: clone, equal, merge, setChainValue, getChainValue
- `NumberUtils`: 숫자 파싱
- `StringUtils`: 문자열 유틸리티
- `DateOnly`, `DateTime`, `Time`: 날짜/시간 타입
- `Type<T>`: 생성자 타입
- Array extensions: `toMap`, `toArrayMap`, `mapMany`, `distinct`, `single`, `first`, `last`, `max`, `sum`, `orderByThis`, `remove`, `insert`
- Map extensions: `getOrCreate`

### 외부 의존성

- `zod`: 런타임 검증 (ExcelWrapper)
- `mime`: MIME 타입 감지 (이미지 삽입)

## API 예시

```typescript
// 워크북 생성
const wb = new ExcelWorkbook();
const wb = new ExcelWorkbook(buffer);
const wb = new ExcelWorkbook(blob);

// 워크시트
const ws = await wb.createWorksheet("Sheet1");
const ws = await wb.getWorksheet(0);

// 셀 조작
await ws.cell(0, 0).setVal("Hello");
const val = await ws.cell(0, 0).getVal();

// 스타일 (객체로 한번에 설정)
await ws.cell(0, 0).setStyle({
  background: "00FF0000",
  border: ["left", "right", "top", "bottom"],
  horizontalAlign: "center",
});

// 셀 병합 (현재 셀에서 상대 위치로)
await ws.cell(0, 0).merge(1, 1);  // (0,0)부터 (1,1)까지 병합

// 이미지
await ws.addImage({ buffer, ext: "png", from: { r: 0, c: 0 }, to: { r: 2, c: 2 } });

// 저장
const buffer = await wb.getBuffer();
const blob = await wb.getBlob();

// ExcelWrapper (Zod 스키마 사용)
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
  birthDate: z.instanceof(DateOnly).optional(),
});

const wrapper = new ExcelWrapper(schema, {
  name: "이름",
  age: "나이",
  birthDate: "생년월일",
});

const records = await wrapper.read(file);
const wb = await wrapper.write("Sheet1", records);
```

## 테스트

### 테스트 환경

- **브라우저 환경** (Node.js fs API 사용 금지)
- 테스트 픽스처는 import로 직접 로드

### 테스트 실행

```bash
# 전체 테스트
npx vitest run packages/excel

# 특정 파일
npx vitest run packages/excel/tests/image-insert.spec.ts
```

## 검증 명령

```bash
# 타입 체크
npx tsc --noEmit -p packages/excel/tsconfig.json 2>&1 | grep "^packages/excel/"

# ESLint
yarn run _sd-cli_ lint "packages/excel/**/*.ts"

# 테스트
npx vitest run packages/excel
```

## 마이그레이션 노트

### 레거시 대비 변경사항

| 항목 | 레거시 | 현재 |
|------|--------|------|
| 패키지명 | `@simplysm/sd-excel` | `@simplysm/excel` |
| 클래스 prefix | `Sd*` | prefix 제거 |
| 메서드명 | `*Async` 접미사 | 접미사 제거 |
| 스타일 API | `cell.style.setX()` 개별 | `cell.setStyle({...})` 객체 |
| 검증 | `TValidFieldSpec` | Zod 스키마 |
| SheetJS | 구 xls 지원 | 제거 (필요시 직접 설치) |

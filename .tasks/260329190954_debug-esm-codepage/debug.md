# 디버그: 브라우저 ESM 환경에서 SdExcelReader codepage 경고 발생

## 출처

- **origin:** `kslhunter/simplysm#8`
- **완료 시 참고:** 수정 완료 후 해당 이슈의 close 및 comment가 필요할 수 있다.

## 에러 증상

- **에러 메시지:** `Codepage tables are not loaded. Non-ASCII characters may not give expected results`
- **위치:** `packages/sd-excel/src/legacy/SdExcelReader.ts:9` — `XLSX.read(data, { codepage: 949 })` 호출 시
- **재현:** 브라우저 ESM 환경(Angular 20)에서 레거시 인코딩(codepage 949 등) 포함 엑셀 파일을 `new SdExcelReader(buffer)`로 파싱

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | E1: 경고가 `$cptable===undefined`일 때 발생 (xlsx.mjs:27221) | E2: SdExcelReader에 cpexcel 로드 코드 없음 | E3: codepage:949 하드코딩 |
|----|----|----|-----|
| H1: cpexcel 모듈 미로드 | C — set_cptable() 호출 없이 $cptable은 undefined | C — import/set_cptable 호출 없음 | N |
| H2: 번들러 tree-shake 문제 | I → 폐기 — 경고는 $cptable 변수 체크이므로 tree-shake와 무관 | N | N |
| H3: codepage 옵션 불필요 | C | N | I → 폐기 — 이슈 목적이 레거시 인코딩 파싱이므로 codepage 필요 |

### 결과: 확정 — H1

ESM 환경에서 xlsx의 codepage 테이블(cpexcel)을 `set_cptable()`으로 등록하지 않아 `$cptable`이 `undefined` 상태. Node.js CJS에서는 xlsx가 전역 `cptable`을 자동 감지할 수 있으나, 브라우저 ESM에서는 명시적 등록이 필요.

## 해결 방안

### 방안 A: SdExcelReader에서 cpexcel 명시적 로드

SdExcelReader 모듈 최상위에서 `set_cptable()`을 호출하여 codepage 테이블을 등록.

```typescript
import * as XLSX from "xlsx";
import * as cpexcel from "xlsx/dist/cpexcel.full.mjs";
XLSX.set_cptable(cpexcel);
```

- **장점:** xlsx 공식 권장 방법. codepage 949가 실제로 동작하여 레거시 인코딩 파일을 올바르게 파싱함
- **반론:** cpexcel.full.mjs의 번들 크기가 추가됨 (~1.5MB). 브라우저 환경에서 실제 codepage 디코딩이 필요 없는 경우에도 로드됨
- **점수:** 정확성 9/10, 안정성 9/10, 호환성 9/10 → **평균 9.0/10**

### 방안 B: codepage 옵션 제거 (경고 억제)

`XLSX.read()` 호출 시 `codepage: 949` 옵션을 제거.

- **장점:** 추가 의존성 없이 경고 제거. 번들 크기 영향 없음
- **반론:** 레거시 인코딩(CP949) 파일의 비-ASCII 문자가 깨질 수 있음
- **점수:** 정확성 3/10, 안정성 6/10, 호환성 4/10 → **평균 4.3/10**

### 방안 C: 수행 안 함

- **장점:** 코드 변경 없음
- **반론:** 경고 계속 출력, codepage 디코딩 미동작
- **점수:** 정확성 2/10, 안정성 5/10, 호환성 2/10 → **평균 3.0/10**

## 선택 결과

**방안 A: SdExcelReader에서 cpexcel 명시적 로드** (평균 9.0/10)

xlsx 공식 권장 방법으로 경고와 실제 인코딩 문제를 모두 해결.

# Code Review: @simplysm/excel

| 항목 | 값 |
|------|-----|
| 분석 대상 | `packages/excel/src/` |
| 일시 | 2026-03-27 |
| 파일 수 | 18 |
| 발견 이슈 | 5건 (Critical: 2, Medium: 2, Low: 1) |

---

## Critical

### LOGIC-001: `stringifyColAddr` — 열 인덱스 676(ZA) 이상에서 잘못된 주소 생성

```
id: LOGIC-001
severity: Critical
category: 로직
location: packages/excel/src/utils/excel-utils.ts:27-34
title: stringifyColAddr가 열 인덱스 676(ZA) 이상에서 잘못된 주소를 생성한다
description: |
  Excel 열 주소는 bijective base-26 체계를 사용한다 (위치 0: A=0~Z=25, 위치 1+: A=1~Z=26).
  현재 while 루프에서 `remained % 26`이 0이 되는 경우(값 26=Z에 해당),
  charCode 64('@')가 생성되고 잘못된 올림이 발생한다.

  예시:
  - stringifyColAddr(676) → "A@A" (기대값: "ZA")
  - stringifyColAddr(701) → "A@Z" (기대값: "ZZ")

  parseColAddr("ZA") = 676은 정상이므로, stringify와 parse가 역함수 관계를 이루지 못한다.
  이 잘못된 주소가 셀 주소(`$.r`), 병합 범위(`ref`), dimension 등 XML에 직접 기록되어
  **열 ZA 이상을 사용하는 Excel 파일이 손상된다**.

  영향 범위: 열 인덱스 676~701(ZA~ZZ), 1352~1377, 2028~2053, ... 등
  26의 배수가 되는 자릿수마다 반복 발생하며, 총 약 624개 열(전체 16384개 중 ~3.8%)이 영향받는다.
suggestion: |
  while 루프에서 bijective base-26 디코딩을 적용한다.
  각 반복 시작에 `remained -= 1`을 추가하고 오프셋을 65로 통일:
  ```typescript
  while (remained !== 0) {
    remained -= 1;
    result = String.fromCharCode((remained % 26) + 65) + result;
    remained = Math.floor(remained / 26);
  }
  ```
```

### LOGIC-002: `convertNumFmtCodeToName` — 커스텀 시간 형식을 날짜로 오분류

```
id: LOGIC-002
severity: Critical
category: 로직
location: packages/excel/src/utils/excel-utils.ts:120-121
title: 커스텀 시간 포맷 코드의 "mm"(분)을 "mm"(월)로 오인하여 Time 대신 DateOnly/DateTime을 반환한다
description: |
  Excel 포맷 코드에서 "mm"은 문맥에 따라 "월(month)" 또는 "분(minute)"을 의미한다.
  "h" 또는 "hh" 뒤에 오는 "mm"은 분이고, 그 외는 월이다.
  현재 코드는 `/mm/i` 정규식으로 단순 매칭하여 문맥을 구분하지 못한다.

  오분류 예시:
  - "h:mm"      → DateOnly (정답: Time) — hasDate만 true
  - "h:mm:ss"   → DateTime (정답: Time) — hasDate+hasTime 모두 true
  - "hh:mm:ss"  → DateTime (정답: Time) — hasDate+hasTime 모두 true
  - "mm:ss"     → DateTime (정답: Time) — hasDate+hasTime 모두 true

  이로 인해 셀 값이 Time 대신 DateOnly/DateTime 객체로 반환된다.
  시간 전용 값(예: 0.5 = 정오)이 "1899-12-30" 같은 의미 없는 날짜로 해석된다.

  내장 포맷 ID(18~21, 32~33, 45~47)는 `convertNumFmtIdToName`에서 정상 처리되므로
  커스텀 포맷 코드(numFmtId >= 164)가 있는 셀에서만 발생한다.
suggestion: |
  "mm"이 시간 컨텍스트(h/hh 뒤)에 있는지 판별하는 로직을 추가한다.
  예시: "mm" 앞에 "h" 또는 "hh"가 있으면 분으로 처리하여 hasDate에서 제외.
  ```typescript
  // "h" 또는 "hh" 뒤의 "mm"을 제거한 후 날짜 판별
  const withoutTimeMM = numFmtCode.replace(/h{1,2}\s*:?\s*mm/gi, "");
  const hasDate = /yy/i.test(numFmtCode) || /dd/i.test(numFmtCode) || /mm/i.test(withoutTimeMM);
  ```
```

---

## Medium

### LOGIC-003: `insertCopyRow` — 삽입 지점을 관통하는 다중행 병합이 파괴된다

```
id: LOGIC-003
severity: Medium
category: 로직
location: packages/excel/src/excel-worksheet.ts:108-126
title: insertCopyRow가 삽입 지점을 관통하는 다중행 병합 셀을 파괴한다
description: |
  insertCopyRow의 마지막 단계에서 copyRow(adjustedSrcR, targetR)를 호출할 때,
  copyRow 내부의 병합 처리 로직이 다음을 수행한다:
  1. 대상 행(targetR)과 겹치는 모든 병합을 제거
  2. 원본 행의 병합을 rowDiff만큼 이동하여 새로 생성

  원본 행이 다중행 병합에 포함되어 있고, 그 병합이 삽입 지점을 관통하면:
  - shiftMergeCells에서 병합이 확장됨 (예: A1:A3 → A1:A4)
  - copyRow에서 확장된 병합이 제거되고, 엉뚱한 위치에 새 병합이 생성됨

  예시: 병합 A1:A3, insertCopyRow(srcR=0, targetR=2)
  - shiftMergeCells 후: A1:A4 (정상)
  - copyRow(0, 2) 실행 시: A1:A4 병합 제거 → A3:A7 병합 생성
  - 결과: 원래 A1:A4 병합이 사라짐

  단일행 병합(가로 병합)에서는 발생하지 않으며,
  삽입 지점을 관통하는 세로 다중행 병합에서만 발생한다.
suggestion: |
  copyRow의 병합 처리에서, 원본 병합과 대상 병합이 동일한 경우(삽입으로 인해
  확장된 병합을 다시 제거하는 상황)를 감지하여 건너뛰도록 한다.
  또는 insertCopyRow에서 마지막 copyRow 호출 시 skipMerge: true를 사용하고,
  삽입 위치의 병합을 별도 로직으로 처리한다.
```

### LOGIC-004: `getDataTable` — 중복 헤더 이름 시 데이터 유실

```
id: LOGIC-004
severity: Medium
category: 로직
location: packages/excel/src/excel-worksheet.ts:167-178
title: 동일한 헤더 이름을 가진 열이 여러 개일 때, 마지막 열만 매핑되고 이전 열의 데이터가 유실된다
description: |
  headerMap이 Map<string, number>이므로, 동일한 헤더 이름이 있으면
  나중에 발견된 열 인덱스가 이전 값을 덮어쓴다.
  결과적으로 같은 이름의 첫 번째(또는 중간) 열 데이터가 조용히 무시된다.

  예시: A열="이름", B열="금액", C열="이름" (중복)
  → headerMap에 "이름"=2(C열)만 남음 → A열 "이름" 데이터 유실

  에러나 경고 없이 데이터가 누락되므로, 사용자가 결과의 정확성을 검증하기 어렵다.
suggestion: |
  중복 헤더 발견 시 경고를 출력하거나 에러를 던진다.
  또는 중복 헤더에 접미사를 붙여 구분한다 (예: "이름", "이름_2").
```

---

## Low

### DESIGN-001: `ExcelWrapper.write` — 에러 경로에서 ExcelWorkbook 리소스 미해제

```
id: DESIGN-001
severity: Low
category: 설계
location: packages/excel/src/excel-wrapper.ts:109
title: write 메서드에서 에러 발생 시 생성된 ExcelWorkbook이 해제되지 않는다
description: |
  write 메서드는 먼저 ExcelWorkbook을 생성한 후 데이터를 기록한다.
  기록 중 에러가 발생하면 wb 참조가 반환되지 않아 호출자가 close()를 호출할 수 없다.
  새 워크북(파일 인자 없음)은 메모리 전용이므로 GC가 처리하지만,
  명시적 리소스 해제 패턴이 깨진다.
suggestion: |
  try-catch로 감싸서 에러 시 wb.close()를 호출한다.
  ```typescript
  const wb = new ExcelWorkbook();
  try {
    // ... 기록 로직 ...
    return wb;
  } catch (e) {
    await wb.close();
    throw e;
  }
  ```
```

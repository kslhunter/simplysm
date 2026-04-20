# Eval: sd-doc-extract

## 행동 Eval

### 시나리오 1: EML 재귀 추출 (첨부파일 4개 → 각 첨부 재귀 추출)
- 사전조건: `.claude/skills/sd-doc-extract/eval_assets/wms-feature-request.eml` 파일을 workspace 루트에 복사
- 입력: "/sd-doc-extract wms-feature-request.eml"
- 체크리스트:
  - [ ] extract.py가 실행되었는가
  - [ ] 실행 시 eml 파일 경로를 인자로 전달했는가
  - [ ] 최상위 인덱스 .md 파일이 생성되었는가
  - [ ] 추출 디렉토리에 4개의 첨부파일(pptx, xlsb, docx, xlsx)이 존재하는가
  - [ ] 각 첨부파일에 대한 재귀 추출 하위 디렉토리(attachment_N_* 폴더)가 존재하는가
  - [ ] 각 첨부파일의 재귀 추출 결과로 인덱스 .md 파일(attachment_N_*.md)이 추출 디렉토리에 생성되었는가
  - [ ] 추출 결과(인덱스 .md 경로, 추출 요약)를 사용자에게 텍스트로 출력했는가

### 시나리오 2: 지원하지 않는 형식
- 사전조건: workspace에 test.txt 파일 존재
- 입력: "/sd-doc-extract test.txt를 추출해줘"
- 체크리스트:
  - [ ] extract.py가 실행되지 않았거나, 실행 후 에러 메시지가 사용자에게 전달되었다
  - [ ] 지원하지 않는 형식임을 사용자에게 알렸는가
  - [ ] 지원 형식 목록(.docx, .xlsx, .xlsb, .pptx, .pdf, .eml, .msg)을 안내했는가

### 시나리오 3: 파일 미존재
- 사전조건: workspace에 해당 파일 없음
- 입력: "/sd-doc-extract nonexistent.docx를 추출해줘"
- 체크리스트:
  - [ ] 파일이 존재하지 않음을 사용자에게 알렸는가
  - [ ] extract.py가 실행되지 않았는가

### 시나리오 4: 인라인 배치 — PPTX
- 사전조건: 시나리오 1의 재귀 추출 결과 중 pptx 인덱스 .md가 존재
- 입력: 시나리오 1과 동일 (생성된 pptx .md 내용 검증)
- 체크리스트:
  - [ ] pptx 인덱스 .md에서 각 슬라이드(`[Slide N]`) 섹션 내에 해당 슬라이드에 속하는 이미지가 마크다운 링크로 인라인 배치되어 있다
  - [ ] 이미지가 텍스트와 분리된 별도 테이블에만 존재하지 않는다 — 해당 슬라이드 컨텍스트 안에 위치한다
  - [ ] OLE embedded 객체가 있는 슬라이드의 경우, 해당 슬라이드 섹션 내에 embedded 링크가 인라인 배치되어 있다

### 시나리오 5: 인라인 배치 — XLSX
- 사전조건: `.claude/skills/sd-doc-extract/eval_assets/wms-estimate.xlsx` 파일을 workspace 루트에 복사
- 입력: "/sd-doc-extract wms-estimate.xlsx"
- 체크리스트:
  - [ ] xlsx 인덱스 .md에서 이미지가 있는 시트의 경우, 해당 이미지의 anchor(셀 좌표) 근처에 이미지가 인라인 배치되어 있다
  - [ ] embedded가 있는 시트의 경우, 해당 시트 섹션 내에 embedded 링크가 인라인 배치되어 있다

### 시나리오 6: XLSB VBA 매크로 추출
- 사전조건: `.claude/skills/sd-doc-extract/eval_assets/embedded_002_Microsoft_Excel_Binary_Worksheet1.xlsb` 파일을 workspace 루트에 복사
- 입력: "/sd-doc-extract embedded_002_Microsoft_Excel_Binary_Worksheet1.xlsb"
- 체크리스트:
  - [ ] 인덱스 .md 파일이 생성되었다
  - [ ] 인덱스 .md 또는 본문 참조 파일(body.txt)에 `[VBA Macros]` 섹션이 존재한다
  - [ ] VBA 모듈별(ThisWorkbook, Sheet1, Module2 등) 소스코드가 fenced code block으로 포함되어 있다 (인덱스 .md 또는 body.txt)
  - [ ] Analysis 테이블이 존재하며, AutoExec 또는 Suspicious 항목이 1개 이상 포함되어 있다 (인덱스 .md 또는 body.txt)
  - [ ] 셀 데이터(마크다운 테이블)도 함께 추출되어 있다 (VBA만 추출된 것이 아니다)

## 안티패턴 Eval

- [ ] extract.py를 사용하지 않고 문서 내용을 직접 읽으려 시도하지 않았는가
- [ ] 사용자에게 확인 없이 출력 디렉토리를 임의로 변경하지 않았는가
- [ ] 이미지나 embedded 파일이 본문과 무관한 위치(문서 끝 테이블 등)에만 나열되어 있지 않은가 — 원문에서 등장하는 페이지/슬라이드/시트/문단 위치에 인라인 배치되어야 한다

# Eval: sd-doc-extract

## 행동 Eval

### 시나리오 1: EML 재귀 추출 (첨부파일 4개 → 각 첨부 재귀 추출)
- 사전조건: `.claude/skills/sd-doc-extract/eval_assets/WMS기능개발관련요구사항전달및일정확인요청.eml` 파일을 workspace 루트에 복사
- 입력: "/sd-doc-extract WMS기능개발관련요구사항전달및일정확인요청.eml"
- 체크리스트:
  - [ ] python .claude/skills/sd-doc-extract/extract.py를 Bash로 실행했는가
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
  - [ ] extract.py를 실행하지 않았는가 (또는 실행 후 에러를 적절히 처리했는가)
  - [ ] 지원하지 않는 형식임을 사용자에게 알렸는가
  - [ ] 지원 형식 목록(.docx, .xlsx, .xlsb, .pptx, .pdf, .eml, .msg)을 안내했는가

### 시나리오 3: 파일 미존재
- 사전조건: workspace에 해당 파일 없음
- 입력: "/sd-doc-extract nonexistent.docx를 추출해줘"
- 체크리스트:
  - [ ] 파일이 존재하지 않음을 사용자에게 알렸는가
  - [ ] extract.py를 실행하지 않았는가

## 안티패턴 Eval

- [ ] extract.py를 사용하지 않고 문서를 직접 Read로 열려고 시도하지 않았는가
- [ ] 사용자에게 확인 없이 출력 디렉토리를 임의로 변경하지 않았는가

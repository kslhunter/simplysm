---
name: sd-doc-extract
description: 문서/이메일 파일을 재귀 해체하여 텍스트, 이미지, 첨부 파일을 추출한다. TRIGGER when 문서 추출/해체 요청.
argument-hint: <파일 경로>
---

# sd-doc-extract: 문서 해체 추출

문서 및 이메일 파일을 재귀적으로 해체하여 텍스트, 이미지, 첨부 파일을 추출하는 스킬이다.
추출 결과는 타임스탬프 기반 디렉토리에 저장되며, index.md로 요약된다.

지원 포맷: `.docx`, `.xlsx`, `.xlsb`, `.pptx`, `.pdf`, `.eml`, `.msg`

한국어로 응답한다.

## 입력

`$ARGUMENTS`로 대상 파일 경로를 받는다.

예시:
- `/sd-doc-extract 2024년_매출보고서.xlsx`
- `/sd-doc-extract ./docs/계약서.pdf`

## 프로세스

### 1단계: 파일 존재 검증

`$ARGUMENTS`에서 파일 경로를 추출한다.

Bash로 해당 파일이 실제로 존재하는지 확인한다.
파일이 존재하지 않으면 사용자에게 다음을 안내하고 종료한다:
- 파일을 찾을 수 없다는 메시지
- 전달받은 경로

### 2단계: 포맷 검증

파일 확장자가 지원 포맷 목록에 포함되는지 확인한다.

지원 포맷: `.docx`, `.xlsx`, `.xlsb`, `.pptx`, `.pdf`, `.eml`, `.msg`

미지원 포맷이면 사용자에게 다음을 안내하고 종료한다:
- 해당 확장자는 지원하지 않는다는 메시지
- 지원 포맷 목록: `.docx`, `.xlsx`, `.xlsb`, `.pptx`, `.pdf`, `.eml`, `.msg`

### 3단계: 출력 디렉토리 생성

파일명에서 확장자를 제거하여 stem을 구한다.
- 예: `2024년_매출보고서.xlsx` → stem은 `2024년_매출보고서`

Bash로 타임스탬프를 얻는다:
```bash
date +%y%m%d%H%M%S
```

`.tasks/{yyMMddHHmmss}_{stem}/` 디렉토리를 생성한다.
- 예: `.tasks/240315143022_2024년_매출보고서/`

### 4단계: extract.py 실행

Bash로 extract.py를 실행한다:
```bash
python .claude/skills/sd-doc-extract/extract.py <file> <out_dir>
```

- `<file>`: 1단계에서 검증한 파일 경로
- `<out_dir>`: 3단계에서 생성한 출력 디렉토리 경로

실행 결과를 확인한다:
- **성공 (exit code 0)**: stdout에 출력된 index.md 경로를 기록하고 5단계로 진행한다.
- **실패 (exit code 1)**: 6단계로 진행한다.

### 5단계: 추출 성공 처리

4단계에서 stdout으로 출력된 index.md 경로를 Read 도구로 읽는다.
읽은 내용을 사용자에게 그대로 표시한다.

### 6단계: 추출 실패 처리

extract.py 실행 시 출력된 에러 메시지를 사용자에게 표시한다.

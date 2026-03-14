---
name: sd-document
description: 문서 파일(.docx/.xlsx/.pptx/.pdf)을 읽어 분석하거나, 새 문서를 생성. 사용자가 워드/엑셀/PPT/PDF 파일의 분석이나 생성을 요청할 때 사용
argument-hint: "<문서 파일 경로>"
---

# sd-document: 문서 파일 읽기/쓰기

문서 파일(.docx/.xlsx/.pptx/.pdf)을 Python 스크립트로 읽어 텍스트와 이미지를 추출하거나, 새 문서를 생성한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 문서 파일 경로를 추출한다.
- `$ARGUMENTS`가 비어있으면 현재 대화 맥락에서 `.docx`, `.xlsx`, `.pptx`, `.pdf` 파일 경로를 찾는다. 대화 맥락도 없으면 AskUserQuestion으로 파일 경로를 요청한다
- 지원 확장자(`.docx`, `.xlsx`, `.pptx`, `.pdf`)가 아니면 "지원하지 않는 파일 형식입니다"를 안내하고 종료한다

## 2. 작업 방향 결정

사용자의 요청이 **읽기**(분석/추출)인지 **쓰기**(생성)인지 **편집**(기존 파일 수정)인지 판단한다.

- **읽기** → 3단계로 이동
- **쓰기** → 5단계로 이동
- **편집** → 3단계로 먼저 이동하여 기존 내용을 파악한 뒤, 5단계에서 수정 스크립트를 작성한다

### 포맷별 지원 현황

| 포맷 | 읽기 | 쓰기 | 라이브러리 |
|------|------|------|-----------|
| DOCX | 지원 | 지원 | `python-docx` |
| XLSX | 지원 | 지원 | `openpyxl`, `pandas` |
| PPTX | 지원 | 미지원 | `python-pptx` |
| PDF  | 지원 | 미지원 | `pdfplumber`, `pypdf` |

누락 패키지는 스크립트 최초 실행 시 자동 설치된다.

## 3. 읽기: 추출 스크립트 실행

파일 확장자에 맞는 추출 스크립트를 Bash로 실행한다:

```bash
python ${CLAUDE_SKILL_DIR}/extract_docx.py <파일경로>
python ${CLAUDE_SKILL_DIR}/extract_xlsx.py <파일경로>
python ${CLAUDE_SKILL_DIR}/extract_pptx.py <파일경로>
python ${CLAUDE_SKILL_DIR}/extract_pdf.py  <파일경로>
```

### 출력

- **stdout**: 텍스트 및 위치 정보 (Markdown 형식)
- **이미지 파일**: `<파일명>_files/` 디렉토리에 저장

### 위치 정보

| 포맷 | 위치 표현 |
|------|----------|
| DOCX | 문단 흐름 순서 (텍스트-이미지 인라인) |
| XLSX | 셀 위치 (A1, B2 등) |
| PPTX | Shape 좌표 (left/top 인치) + 슬라이드 번호 |
| PDF  | 페이지 번호 |

## 4. 읽기: 추출 결과 분석

3단계 출력에서 추출된 파일 경로를 확인하고 다음을 수행한다:

1. **이미지**: `_files/` 디렉토리에 저장된 각 이미지를 **Read** 도구로 열어 시각적 분석
2. **텍스트**: stdout에 출력된 텍스트를 사용자 요청에 맞게 분석/요약

분석 완료 후 종료한다.

## 5. 쓰기: 문서 생성/편집

사용자 요청에 따라 Python 스크립트를 작성하여 문서를 생성하거나 편집한다.
PPTX, PDF 쓰기는 미지원이므로 요청 시 안내한다.

### DOCX (`python-docx`)

```python
from docx import Document

doc = Document()                          # 새 문서
# doc = Document("existing.docx")         # 기존 문서 편집
doc.add_heading("제목", level=1)
doc.add_paragraph("본문 내용")
table = doc.add_table(rows=2, cols=3)
table.cell(0, 0).text = "항목"
doc.save("output.docx")
```

기존 문서 편집: `Document("existing.docx")`로 열어 `paragraph.text`, `table.cell().text`를 수정한다.

### XLSX (`openpyxl`)

데이터와 수식 중심. 서식(색상, 테두리)은 필수가 아니다.

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws["A1"] = "항목"
ws["B1"] = "수량"
ws.append(["사과", 10])
ws.append(["배", 20])
ws["B4"] = "=SUM(B2:B3)"
wb.save("output.xlsx")
```

기존 파일 편집: `load_workbook("existing.xlsx")`로 열어 수정한다.
pandas DataFrame 내보내기: `df.to_excel("output.xlsx", index=False)`

## 6. 주의사항

- **문자 인코딩**: 스크립트에 UTF-8 처리가 내장되어 있으므로 반드시 스크립트를 통해 추출한다
- **이미지 누락**: 추출 후 `_files/` 디렉토리의 이미지를 반드시 Read한다
- **XLSX data_only**: `load_workbook(data_only=True)`는 수식을 제거한다. 수식 보존이 필요하면 `data_only=False`를 사용한다

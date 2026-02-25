---
name: sd-document
description: "Use when reading, analyzing, or creating document files (.docx, .xlsx, .pptx, .pdf). Triggers: file analysis requests, client document review, mail-format DOCX generation, data XLSX export."
---

# Document Processing

## Overview

문서 파일(.docx/.xlsx/.pptx/.pdf) 읽기/쓰기를 처리한다.
포맷별 Python 스크립트로 텍스트 + 이미지를 위치 정보와 함께 추출하고, 이미지는 파일로 저장하여 Claude Read로 분석한다.

## Quick Reference

| 포맷 | 읽기 | 쓰기 | 라이브러리 |
|------|------|------|-----------|
| DOCX | O | O | `python-docx` |
| XLSX | O | O | `openpyxl`, `pandas` |
| PPTX | O | X | `python-pptx` |
| PDF  | O | X | `pdfplumber`, `pypdf` |

미설치 패키지는 스크립트 첫 실행 시 자동 pip install 된다.

## 읽기 (문서 분석)

각 포맷별 추출 스크립트를 실행한다:

```bash
python .claude/skills/sd-document/extract_docx.py <파일경로>
python .claude/skills/sd-document/extract_xlsx.py <파일경로>
python .claude/skills/sd-document/extract_pptx.py <파일경로>
python .claude/skills/sd-document/extract_pdf.py  <파일경로>
```

### 출력
- **stdout**: 텍스트 + 위치 정보 (Markdown 형식)
- **이미지 파일**: `<파일명>_files/` 디렉토리에 저장

### 위치 정보

| 포맷 | 위치 표현 |
|------|----------|
| DOCX | 문단 흐름 순서 (텍스트-이미지 인라인) |
| XLSX | 셀 위치 (A1, B2 등) |
| PPTX | shape별 left/top 좌표 (인치) + 슬라이드 번호 |
| PDF  | 페이지 번호 |

### 이미지 분석
추출된 이미지 파일을 Claude **Read** 도구로 열어서 시각적으로 분석한다.

### 스캔 PDF (OCR)
텍스트 추출 결과가 비어있으면 스크립트가 OCR 안내를 출력한다.
Tesseract OCR은 OS 레벨 설치가 필요하다 (pip 자동설치 불가).

## 쓰기

### DOCX (`python-docx`)

메일 양식, 간단한 보고서 수준.

```python
from docx import Document

doc = Document()                          # 새 문서
# doc = Document("existing.docx")         # 기존 문서 수정
doc.add_heading("제목", level=1)
doc.add_paragraph("본문 내용")
table = doc.add_table(rows=2, cols=3)
table.cell(0, 0).text = "항목"
doc.save("output.docx")
```

기존 문서 수정: `Document("existing.docx")`로 열어서 `paragraph.text` 치환, `table.cell().text` 수정.

### XLSX (`openpyxl`)

데이터 + 수식 위주. 서식(색상, 테두리) 불필요.

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

기존 파일: `load_workbook("existing.xlsx")`로 열어서 수정.
pandas DataFrame 내보내기: `df.to_excel("output.xlsx", index=False)`

## Common Mistakes

- **Windows 한글 깨짐**: 스크립트에 UTF-8 래핑이 내장되어 있으므로, 반드시 스크립트를 통해 추출할 것
- **이미지 누락**: 추출 후 `_files/` 디렉토리의 이미지를 Read로 확인하는 것을 잊지 말 것
- **XLSX data_only**: `load_workbook(data_only=True)`로 열면 수식이 사라짐 — 수식 보존이 필요하면 `data_only=False` 사용

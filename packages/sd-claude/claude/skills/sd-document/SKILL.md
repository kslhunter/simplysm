---
name: sd-document
description: .docx, .xlsx, .pptx, .pdf 파일과 관련하여 "문서 읽기/분석", "파일 내용 추출", "DOCX/XLSX 생성", "고객 문서 검토", "데이터 내보내기"를 요청할때 사용.
---

# SD Document — 문서 파일 읽기/쓰기

문서 파일(.docx/.xlsx/.pptx/.pdf)을 Python 스크립트로 읽거나 쓴다. 읽기 시 텍스트와 이미지를 위치 정보와 함께 추출하고, 이미지를 파일로 저장한 뒤 Claude Read로 분석한다.

ARGUMENTS: 문서 파일 경로 (필수). `.docx`, `.xlsx`, `.pptx`, `.pdf` 파일 경로를 지정한다.

---

## Step 1: 작업 방향 결정

ARGUMENTS에서 파일 경로를 추출하고, 사용자의 요청이 **읽기**(분석/추출)인지 **쓰기**(생성/편집)인지 판단하라.

- **읽기** → Step 2로 이동
- **쓰기** → Step 4로 이동

### 형식별 지원 현황

| 형식 | 읽기 | 쓰기 | 라이브러리 |
|------|------|------|-----------|
| DOCX | 가능 | 가능 | `python-docx` |
| XLSX | 가능 | 가능 | `openpyxl`, `pandas` |
| PPTX | 가능 | 불가 | `python-pptx` |
| PDF  | 가능 | 불가 | `pdfplumber`, `pypdf` |

누락된 패키지는 첫 스크립트 실행 시 자동 설치된다.

## Step 2: 문서 읽기 (추출 스크립트 실행)

파일 확장자에 맞는 추출 스크립트를 실행하라:

```bash
python .claude/skills/sd-document/extract_docx.py <파일경로>
python .claude/skills/sd-document/extract_xlsx.py <파일경로>
python .claude/skills/sd-document/extract_pptx.py <파일경로>
python .claude/skills/sd-document/extract_pdf.py  <파일경로>
```

### 출력
- **stdout**: 텍스트 및 위치 정보 (Markdown 형식)
- **이미지 파일**: `<파일명>_files/` 디렉토리에 저장

### 위치 정보

| 형식 | 위치 표현 방식 |
|------|--------------|
| DOCX | 문단 흐름 순서 (텍스트-이미지 인라인) |
| XLSX | 셀 위치 (A1, B2 등) |
| PPTX | 도형 left/top 좌표 (인치) + 슬라이드 번호 |
| PDF  | 페이지 번호 |

## Step 3: 추출 결과 분석

Step 2의 출력에서 추출된 파일 경로를 확인하고 아래를 수행하라:

1. **이미지**: `_files/` 디렉토리에 저장된 각 이미지를 **Read** 도구로 열어 시각적 분석을 수행
2. **텍스트**: stdout으로 출력된 텍스트를 사용자의 요청에 맞게 분석/요약

## Step 4: 문서 쓰기

사용자의 요청에 따라 Python 스크립트를 작성하여 문서를 생성하거나 편집하라.

### DOCX (`python-docx`)

메일 템플릿 및 간단한 보고서용.

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

기존 문서 편집: `Document("existing.docx")`로 열어 `paragraph.text` 교체, `table.cell().text` 수정.

### XLSX (`openpyxl`)

데이터와 수식 중심. 서식(색상, 테두리)은 필수가 아님.

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

기존 파일 편집: `load_workbook("existing.xlsx")`로 열어 수정.
pandas DataFrame 내보내기: `df.to_excel("output.xlsx", index=False)`

## 흔한 실수

- **문자 인코딩**: 스크립트에 UTF-8 처리가 내장되어 있으므로 항상 스크립트를 통해 추출할 것
- **이미지 누락**: 추출 후 `_files/` 디렉토리의 이미지를 반드시 읽을 것
- **XLSX data_only**: `load_workbook(data_only=True)`는 수식을 제거함 — 수식을 유지하려면 `data_only=False` 사용

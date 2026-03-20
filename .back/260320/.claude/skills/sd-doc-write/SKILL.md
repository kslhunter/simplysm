---
name: sd-doc-write
description: 문서 파일(.docx/.xlsx)을 생성하거나 편집. 사용자가 워드/엑셀 문서 생성이나 편집을 요청할 때 사용
argument-hint: "<출력 파일 경로>"
---

# sd-doc-write: 문서 파일 생성/편집

문서 파일(.docx/.xlsx)을 사용자 요청에 따라 생성하거나 편집한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 출력 파일 경로와 요청 내용을 파악한다.
- `$ARGUMENTS`가 비어있으면 현재 대화 맥락에서 요청 내용을 파악한다. 대화 맥락도 없으면 AskUserQuestion으로 요청 내용을 확인한다
- 지원 확장자: `.docx`, `.xlsx`
- PPTX, PDF 쓰기는 미지원이므로 요청 시 "PPTX/PDF 생성은 지원하지 않습니다"를 안내하고 종료한다

## 2. 문서 생성/편집

사용자 요청에 따라 Python 스크립트를 작성하여 Bash로 실행한다.

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

## 3. 완료 안내

생성/편집이 완료되면 다음을 출력한다:
- 생성된 파일 경로
- 파일 크기

## 주의사항

- **문자 인코딩**: UTF-8 처리를 위해 스크립트에 적절한 인코딩을 설정한다
- **XLSX data_only**: `load_workbook(data_only=True)`는 수식을 제거한다. 수식 보존이 필요하면 `data_only=False`를 사용한다
- **기존 파일 읽기**: 기존 문서를 편집하려면 먼저 `/sd-doc-extract`로 현재 내용을 파악한 후 수정한다

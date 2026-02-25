---
name: sd-document
description: "Use when reading, analyzing, or creating document files (.docx, .xlsx, .pptx, .pdf). Triggers: file analysis requests, client document review, mail-format DOCX generation, data XLSX export."
---

# Document Processing

## Overview

Read and write document files (.docx/.xlsx/.pptx/.pdf).
Python scripts extract text and images with location information by format, save images to files, and analyze them with Claude Read.

## Quick Reference

| Format | Read | Write | Library |
|--------|------|-------|---------|
| DOCX | Yes | Yes | `python-docx` |
| XLSX | Yes | Yes | `openpyxl`, `pandas` |
| PPTX | Yes | No | `python-pptx` |
| PDF  | Yes | No | `pdfplumber`, `pypdf` |

Missing packages are auto-installed on first script run.

## Reading (Document Analysis)

Run extraction scripts by format:

```bash
python .claude/skills/sd-document/extract_docx.py <filepath>
python .claude/skills/sd-document/extract_xlsx.py <filepath>
python .claude/skills/sd-document/extract_pptx.py <filepath>
python .claude/skills/sd-document/extract_pdf.py  <filepath>
```

### Output
- **stdout**: Text and location information (Markdown format)
- **Image files**: Saved to `<filename>_files/` directory

### Location Information

| Format | Location Representation |
|--------|-------------------------|
| DOCX | Paragraph flow order (text-image inline) |
| XLSX | Cell position (A1, B2, etc.) |
| PPTX | Shape left/top coordinates (inches) + slide number |
| PDF  | Page number |

### Image Analysis
Open extracted image files with Claude **Read** tool for visual analysis.

### Scanned PDF (OCR)
If text extraction is empty, the script outputs OCR instructions.
Tesseract OCR requires OS-level installation (not auto-installable via pip).

## Writing

### DOCX (`python-docx`)

For mail templates and simple reports.

```python
from docx import Document

doc = Document()                          # New document
# doc = Document("existing.docx")         # Edit existing document
doc.add_heading("Title", level=1)
doc.add_paragraph("Body content")
table = doc.add_table(rows=2, cols=3)
table.cell(0, 0).text = "Item"
doc.save("output.docx")
```

Edit existing document: open with `Document("existing.docx")`, replace `paragraph.text`, modify `table.cell().text`.

### XLSX (`openpyxl`)

Focuses on data and formulas. Formatting (colors, borders) not required.

```python
from openpyxl import Workbook

wb = Workbook()
ws = wb.active
ws["A1"] = "Item"
ws["B1"] = "Quantity"
ws.append(["Apple", 10])
ws.append(["Pear", 20])
ws["B4"] = "=SUM(B2:B3)"
wb.save("output.xlsx")
```

Edit existing file: open with `load_workbook("existing.xlsx")` and modify.
Export pandas DataFrame: `df.to_excel("output.xlsx", index=False)`

## Common Mistakes

- **Character encoding**: Scripts have built-in UTF-8 handling; always extract through scripts
- **Missing images**: After extraction, remember to read images in `_files/` directory
- **XLSX data_only**: `load_workbook(data_only=True)` removes formulas — use `data_only=False` to preserve them

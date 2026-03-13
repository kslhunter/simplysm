---
name: sd-document
description: Used when requesting "read/analyze documents", "extract file content", "create DOCX/XLSX", "review customer documents", or "export data" related to .docx, .xlsx, .pptx, .pdf files.
---

# SD Document — Read/Write Document Files

Reads or writes document files (.docx/.xlsx/.pptx/.pdf) using Python scripts. When reading, extracts text and images along with positional information, saves images to files, and analyzes them with Claude Read.

ARGUMENTS: Document file path (required). Specify a `.docx`, `.xlsx`, `.pptx`, or `.pdf` file path.

---

## Step 1: Determine Task Direction

Extract the file path from ARGUMENTS and determine whether the user's request is **read** (analyze/extract) or **write** (create/edit).

- **Read** → Go to Step 2
- **Write** → Go to Step 4

### Format Support Matrix

| Format | Read | Write | Library |
|--------|------|-------|---------|
| DOCX | Supported | Supported | `python-docx` |
| XLSX | Supported | Supported | `openpyxl`, `pandas` |
| PPTX | Supported | Not supported | `python-pptx` |
| PDF  | Supported | Not supported | `pdfplumber`, `pypdf` |

Missing packages are automatically installed on first script execution.

## Step 2: Read Document (Run Extraction Script)

Run the extraction script matching the file extension:

```bash
python .claude/skills/sd-document/extract_docx.py <file_path>
python .claude/skills/sd-document/extract_xlsx.py <file_path>
python .claude/skills/sd-document/extract_pptx.py <file_path>
python .claude/skills/sd-document/extract_pdf.py  <file_path>
```

### Output
- **stdout**: Text and positional information (Markdown format)
- **Image files**: Saved to `<filename>_files/` directory

### Positional Information

| Format | Position Representation |
|--------|----------------------|
| DOCX | Paragraph flow order (text-image inline) |
| XLSX | Cell position (A1, B2, etc.) |
| PPTX | Shape left/top coordinates (inches) + slide number |
| PDF  | Page number |

## Step 3: Analyze Extraction Results

Check the extracted file paths from Step 2 output and perform the following:

1. **Images**: Open each image saved in the `_files/` directory with the **Read** tool for visual analysis
2. **Text**: Analyze/summarize the text output to stdout according to the user's request

## Step 4: Write Document

Write a Python script to create or edit documents according to the user's request.

### DOCX (`python-docx`)

For email templates and simple reports.

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

Edit existing document: Open with `Document("existing.docx")` and replace `paragraph.text`, modify `table.cell().text`.

### XLSX (`openpyxl`)

Data and formula focused. Formatting (colors, borders) is not required.

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

Edit existing file: Open with `load_workbook("existing.xlsx")` and modify.
Export pandas DataFrame: `df.to_excel("output.xlsx", index=False)`

## Common Mistakes

- **Character encoding**: Scripts have built-in UTF-8 handling, so always extract through scripts
- **Missing images**: After extraction, always read images in the `_files/` directory
- **XLSX data_only**: `load_workbook(data_only=True)` removes formulas — use `data_only=False` to preserve formulas

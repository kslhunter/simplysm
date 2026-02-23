---
name: sd-eml-analyze
description: Use when user asks to analyze, read, or summarize .eml email files, or when encountering .eml attachments that need content extraction including embedded PDF, XLSX, PPTX files
---

# EML Email Analyzer

## Overview

Python script that parses .eml files and extracts content from all attachments (PDF, XLSX, PPTX) into a single structured markdown report. Handles Korean encodings (EUC-KR, CP949, ks_c_5601-1987) automatically.

## When to Use

- User provides a `.eml` file to analyze or summarize
- Need to extract text from email attachments (PDF, XLSX, PPTX)
- Korean email content needs proper decoding

## Usage

```bash
python .claude/skills/sd-eml-analyze/eml-analyzer.py <eml_file_path>
```

First run auto-installs: `pdfminer.six`, `python-pptx`, `openpyxl`.

## Output Format

Markdown report with sections:

1. **Mail info table**: Subject, From, To, Cc, Date, attachment count
2. **Body text**: Plain text (HTML stripped if no plain text)
3. **Attachment analysis**: Summary table + extracted text per file

## Supported Attachments

| Format                                           | Method                                  |
| ------------------------------------------------ | --------------------------------------- |
| PDF                                              | pdfminer.six text extraction            |
| XLSX/XLS                                         | openpyxl cell data as markdown table    |
| PPTX                                             | python-pptx slide text + tables + notes |
| Text files (.txt, .csv, .json, .xml, .html, .md) | UTF-8/CP949 decode                      |
| Images                                           | Filename and size only                  |

## Common Mistakes

- **Wrong Python**: Ensure `python` points to Python 3.8+
- **Firewall blocking pip**: First run needs internet for package install
- **Legacy .ppt/.xls**: Only modern Office formats (.pptx/.xlsx) supported

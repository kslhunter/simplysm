---
name: sd-email-analyze
description: "Email file (.eml/.msg) parsing (explicit invocation only)"
model: haiku
---

# Email Analyzer

## Overview

Python script that parses `.eml` and `.msg` (Outlook) email files. Extracts mail headers, body text, inline images, and attachments to disk. Content analysis of extracted files is delegated to Claude's Read tool and `sd-document` skill.

## When to Use

- User provides a `.eml` or `.msg` file to analyze or summarize
- Korean email content needs proper decoding

## Usage

```bash
python .claude/skills/sd-email-analyze/email-analyzer.py <email_file_path>
```

First run auto-installs: `extract-msg`.

### After Running

1. Read the markdown output (mail info, body text, file paths)
2. **Inline images**: Use **Read** tool on each saved path to view
3. **Attachments**: Use **Read** tool (images) or **sd-document** skill scripts (DOCX, XLSX, PPTX, PDF)

## Output

- `<email_stem>_files/` directory with all extracted files
- Markdown report to stdout:
  1. **Mail info table**: Subject, From, To, Cc, Date, counts
  2. **Body text**: Plain text (HTML stripped if no plain text)
  3. **Inline images**: Table with saved file paths
  4. **Attachments**: Table with saved file paths

## Inline Image Handling

Two sources extracted:

1. **CID images**: MIME parts with Content-ID (`cid:` references in HTML)
2. **Data URI images**: Base64-encoded images in HTML (`data:image/...;base64,...`)

## Common Mistakes

- **Wrong Python**: Ensure `python` points to Python 3.8+
- **Firewall blocking pip**: First run needs internet for `extract-msg` install
- **Forgetting inline images**: Always check "본문 삽입 이미지" section and Read each path

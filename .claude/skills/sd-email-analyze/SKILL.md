---
name: sd-email-analyze
description: Used when requesting "email file analysis", "email content extraction", "attachment extraction", or "email summary" for .eml or .msg files.
---

# SD Email Analyze — Email File Analysis and Content Extraction

Parses `.eml` and `.msg` (Outlook) email files to extract and analyze mail headers, body text, inline images, and attachments.

ARGUMENTS: Email file path (required). Specify a `.eml` or `.msg` file path.

---

## Step 1: Parse the Email File

Extract the email file path from ARGUMENTS and run the following command:

```bash
python .claude/skills/sd-email-analyze/email-analyzer.py <email_file_path>
```

- On first run, `extract-msg` is automatically installed.
- The output is a markdown report printed to stdout, and extracted files are saved to the `<email_file_name>_files/` directory.

### Output Structure

1. **Mail Info Table**: Subject, From, To, CC, Date, Count
2. **Body Text**: Plain text (if plain text is unavailable, HTML tags are stripped)
3. **Inline Images**: Table of saved file paths
4. **Attachments**: Table of saved file paths

## Step 2: Analyze Extracted Files

Check the extracted file paths from the Step 1 output and perform the following:

1. **Inline Images**: Use the **Read** tool to view each saved path
2. **Attachments**: Use the **Read** tool (for images) or the **sd-document** skill script (for DOCX, XLSX, PPTX, PDF)

### Inline Image Processing

Images are extracted from two sources:

1. **CID Images**: MIME parts with a Content-ID (referenced via `cid:` in HTML)
2. **Data URI Images**: Base64-encoded images within HTML (`data:image/...;base64,...`)
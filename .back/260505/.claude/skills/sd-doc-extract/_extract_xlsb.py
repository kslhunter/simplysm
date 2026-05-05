"""XLSB handler: extract cell data and VBA macros from binary Excel format.

Output format matches the XLSX handler: per sheet, a markdown table with
Excel column letters as headers and the original row number in the first
column.  VBA macros are extracted via oletools and appended as fenced code
blocks.
"""

from _common import ensure_packages

PACKAGES = {"pyxlsb": "pyxlsb", "oletools": "oletools"}


def _escape_md(v):
    if v is None:
        return ""
    s = str(v).strip()
    return (
        s.replace("\\", "\\\\")
        .replace("|", "\\|")
        .replace("\r\n", "<br>")
        .replace("\n", "<br>")
        .replace("\r", "<br>")
    )


def _col_letter(n):
    # 1-based column index → Excel letter (A, B, ..., Z, AA, AB, ...)
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def extract(file_path):
    ensure_packages(PACKAGES)
    from pyxlsb import open_workbook

    text_parts = []

    with open_workbook(file_path) as wb:
        for sheet_name in wb.sheets:
            text_parts.append(f"[Sheet: {sheet_name}]")
            text_parts.append("")

            with wb.get_sheet(sheet_name) as sheet:
                rows_data = []
                max_col = 0
                for row in sheet.rows():
                    if not row:
                        continue
                    row_num = row[0].r + 1  # pyxlsb is 0-based
                    cells = [_escape_md(cell.v) for cell in row]
                    if len(cells) > max_col:
                        max_col = len(cells)
                    rows_data.append((row_num, cells))

                if not rows_data:
                    text_parts.append("(empty sheet)")
                    text_parts.append("")
                    continue

                headers = ["Row"] + [_col_letter(c) for c in range(1, max_col + 1)]
                text_parts.append("| " + " | ".join(headers) + " |")
                text_parts.append("|" + "|".join(["---"] * len(headers)) + "|")
                for row_num, cells in rows_data:
                    padded = list(cells) + [""] * (max_col - len(cells))
                    text_parts.append(
                        f"| {row_num} | " + " | ".join(padded[:max_col]) + " |"
                    )
                text_parts.append("")

    # --- VBA macro extraction ---
    vba_parts = []
    try:
        from oletools.olevba import VBA_Parser

        vba_parser = VBA_Parser(file_path)
        if vba_parser.detect_vba_macros():
            vba_parts.append("[VBA Macros]")
            vba_parts.append("")
            for filename, stream_path, vba_filename, vba_code in vba_parser.extract_macros():
                vba_parts.append(f"### {vba_filename}")
                vba_parts.append(f"<!-- stream: {stream_path} -->")
                vba_parts.append("")
                vba_parts.append("```vb")
                vba_parts.append(vba_code)
                vba_parts.append("```")
                vba_parts.append("")

            analysis = vba_parser.analyze_macros()
            suspicious = [e for e in analysis if e[0] in ("AutoExec", "Suspicious", "IOC")]
            if suspicious:
                vba_parts.append("### Analysis")
                vba_parts.append("")
                vba_parts.append("| Type | Keyword | Description |")
                vba_parts.append("|------|---------|-------------|")
                for entry_type, keyword, description in suspicious:
                    vba_parts.append(f"| {entry_type} | `{keyword}` | {description} |")
                vba_parts.append("")

        vba_parser.close()
    except Exception:
        pass

    if vba_parts:
        text_parts.append("")
        text_parts.extend(vba_parts)

    return {
        "text": "\n".join(text_parts),
        "images": [],
        "embedded": [],
        "metadata": {},
    }

"""XLSB handler: extract cell data from binary Excel format."""

from _common import ensure_packages

PACKAGES = {"pyxlsb": "pyxlsb"}


def extract(file_path):
    ensure_packages(PACKAGES)
    from pyxlsb import open_workbook

    text_parts = []

    with open_workbook(file_path) as wb:
        for sheet_name in wb.sheets:
            text_parts.append(f"[Sheet: {sheet_name}]")
            with wb.get_sheet(sheet_name) as sheet:
                for row in sheet.rows():
                    cells = [str(cell.v) if cell.v is not None else "" for cell in row]
                    text_parts.append(" | ".join(cells))

    return {
        "text": "\n".join(text_parts),
        "images": [],
        "embedded": [],
        "metadata": {},
    }

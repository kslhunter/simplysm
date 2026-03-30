"""XLSX handler: extract cell data, images, and embedded objects."""

import zipfile
from _common import ensure_packages

PACKAGES = {"openpyxl": "openpyxl"}


def extract(file_path):
    ensure_packages(PACKAGES)
    from openpyxl import load_workbook
    from openpyxl.worksheet.worksheet import Worksheet

    wb = load_workbook(file_path, data_only=True)
    text_parts = []
    images = []
    embedded = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        text_parts.append(f"[Sheet: {sheet_name}]")

        if not isinstance(ws, Worksheet):
            text_parts.append(f"({type(ws).__name__} — 데이터 없음)")
            continue

        if ws.max_row is None or ws.max_row == 0:
            text_parts.append("(empty sheet)")
            continue

        for row in ws.iter_rows(values_only=False):
            cells = []
            for cell in row:
                val = cell.value
                cells.append(str(val).strip() if val is not None else "")
            text_parts.append(f"[{row[0].column_letter}{row[0].row}] " + " | ".join(cells))

        # Images
        ws_images = getattr(ws, '_images', [])
        for img in ws_images:
            data_fn = getattr(img, '_data', None)
            blob = data_fn() if callable(data_fn) else b""
            if blob:
                images.append({
                    "data": blob,
                    "ext": "png",
                    "context": f"sheet '{sheet_name}'",
                })

    # Embedded objects from XLSX ZIP
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            for name in zf.namelist():
                if 'embeddings/' in name.lower():
                    filename = name.split('/')[-1]
                    data = zf.read(name)
                    embedded.append({"filename": filename, "data": data})
    except Exception:
        pass

    return {
        "text": "\n".join(text_parts),
        "images": images,
        "embedded": embedded,
        "metadata": {},
    }

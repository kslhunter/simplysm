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
    img_idx = 0
    emb_idx = 0

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        text_parts.append(f"[Sheet: {sheet_name}]")

        if not isinstance(ws, Worksheet):
            text_parts.append(f"({type(ws).__name__} — 데이터 없음)")
            continue

        if ws.max_row is None or ws.max_row == 0:
            text_parts.append("(empty sheet)")
            continue

        # Collect images for this sheet with anchor row info
        ws_images = getattr(ws, '_images', [])
        row_img_markers = {}  # row_number -> list of img_idx
        for img in ws_images:
            data_fn = getattr(img, '_data', None)
            blob = data_fn() if callable(data_fn) else b""
            if blob:
                img_idx += 1
                images.append({
                    "data": blob,
                    "ext": "png",
                    "context": f"sheet '{sheet_name}'",
                })
                anchor = getattr(img, 'anchor', None)
                anchor_row = None
                if anchor:
                    _from = getattr(anchor, '_from', None)
                    if _from:
                        anchor_row = getattr(_from, 'row', None)
                        if anchor_row is not None:
                            anchor_row += 1  # openpyxl anchor is 0-based
                if anchor_row is None:
                    anchor_row = ws.max_row or 1
                row_img_markers.setdefault(anchor_row, []).append(img_idx)

        # Output rows with inline image markers at anchor positions
        for row in ws.iter_rows(values_only=False):
            cells = []
            for cell in row:
                val = cell.value
                cells.append(str(val).strip() if val is not None else "")
            row_num = row[0].row
            text_parts.append(f"[{row[0].column_letter}{row_num}] " + " | ".join(cells))
            for idx in row_img_markers.get(row_num, []):
                text_parts.append(f"[IMG:{idx}]")

    # Embedded objects from XLSX ZIP
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            for name in zf.namelist():
                if 'embeddings/' in name.lower():
                    filename = name.split('/')[-1]
                    data = zf.read(name)
                    emb_idx += 1
                    embedded.append({"filename": filename, "data": data})
                    text_parts.append(f"[EMB:{emb_idx}]")
    except Exception:
        pass

    return {
        "text": "\n".join(text_parts),
        "images": images,
        "embedded": embedded,
        "metadata": {},
    }

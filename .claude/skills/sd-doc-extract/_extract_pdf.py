"""PDF handler: extract text, tables, images, and attached files."""

import struct
import logging
from _common import ensure_packages, normalize_cell

PACKAGES = {"pdfplumber": "pdfplumber", "pypdf": "pypdf", "Pillow": "PIL"}


def extract(file_path):
    ensure_packages(PACKAGES)
    import pdfplumber
    from pypdf import PdfReader

    text_parts = []
    images = []
    embedded = []

    # Text + table extraction (pdfplumber)
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            text_parts.append(f"[Page {page_num}]")

            text = page.extract_text()
            if text:
                stripped = text.strip()
                if stripped:
                    text_parts.append(stripped)

            tables = page.extract_tables()
            for t_idx, table in enumerate(tables):
                if table:
                    text_parts.append(f"\n### Table {t_idx + 1}\n")
                    for row in table:
                        cells = [normalize_cell(c) for c in row]
                        text_parts.append("| " + " | ".join(cells) + " |")

            text_parts.append("")

    # Image extraction (pypdf)
    logging.getLogger("pypdf").setLevel(logging.ERROR)
    reader = PdfReader(file_path)
    for page_num, page in enumerate(reader.pages, 1):
        for img in page.images:
            data = img.data
            # Filter small mask/decorative images by checking PNG IHDR dimensions
            if data[:4] == b'\x89PNG' and len(data) >= 24:
                w = struct.unpack('>I', data[16:20])[0]
                h = struct.unpack('>I', data[20:24])[0]
                if w <= 4 or h <= 4:
                    continue
            ext = img.name.rsplit('.', 1)[-1] if '.' in img.name else "png"
            images.append({
                "data": data,
                "ext": ext,
                "context": f"Page {page_num}",
            })

    # Embedded file attachments (pypdf 3.x+)
    try:
        for filename, data_list in reader.attachments.items():
            for data in data_list:
                embedded.append({"filename": filename, "data": data})
    except Exception:
        pass

    return {
        "text": "\n".join(text_parts),
        "images": images,
        "embedded": embedded,
        "metadata": {},
    }

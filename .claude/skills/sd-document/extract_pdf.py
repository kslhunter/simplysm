#!/usr/bin/env python3
"""Extract text, tables, and images from PDF files page by page."""

import struct
import logging
from _common import (
    setup_encoding, make_output_paths, print_header, save_image,
    print_image_summary, run_cli, normalize_cell,
)

setup_encoding()


def extract(file_path):
    import pdfplumber
    from pypdf import PdfReader

    fp, out_dir = make_output_paths(file_path)
    img_idx = 0

    print_header(fp)

    # Text + table extraction (pdfplumber)
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"## Page {page_num}\n")

            text = page.extract_text()
            if text:
                stripped = text.strip()
                if stripped:
                    print(stripped)
                    print()

            tables = page.extract_tables()
            for t_idx, table in enumerate(tables):
                if table:
                    print(f"### Table {t_idx + 1}\n")
                    for row in table:
                        cells = [normalize_cell(c) for c in row]
                        print("| " + " | ".join(cells) + " |")
                    print()

    # Image extraction (pypdf page.images API)
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
            img_idx += 1
            img_path = save_image(out_dir, img_idx, data, ext)
            print(f"[IMG] (page={page_num}) {img_path}")

    print()
    print_image_summary(img_idx, out_dir)


if __name__ == "__main__":
    run_cli(extract, "extract_pdf.py", {"pdfplumber": "pdfplumber", "pypdf": "pypdf", "Pillow": "PIL"})

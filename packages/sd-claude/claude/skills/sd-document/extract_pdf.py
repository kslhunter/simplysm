#!/usr/bin/env python3
"""Extract text, tables, and images from PDF files page by page."""

import sys
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

    # Image extraction (pypdf)
    reader = PdfReader(file_path)
    for page_num, page in enumerate(reader.pages, 1):
        if "/XObject" not in (page.get("/Resources") or {}):
            continue
        xobjects = page["/Resources"]["/XObject"].get_object()
        for obj_name in xobjects:
            obj = xobjects[obj_name].get_object()
            if obj.get("/Subtype") == "/Image":
                img_idx += 1
                filters = obj.get("/Filter", "")
                if isinstance(filters, list):
                    filters = filters[0] if filters else ""
                filter_str = str(filters)
                ext = "png"
                if "/DCTDecode" in filter_str:
                    ext = "jpg"
                elif "/JPXDecode" in filter_str:
                    ext = "jp2"
                try:
                    img_path = save_image(out_dir, img_idx, obj.get_data(), ext)
                except Exception as exc:
                    print(f"Warning: failed to decode image {img_idx}: {exc}", file=sys.stderr)
                    img_path = save_image(out_dir, img_idx, obj._data if hasattr(obj, "_data") else b"", "bin")
                print(f"[IMG] (page={page_num}) {img_path}")

    print()
    print_image_summary(img_idx, out_dir)


if __name__ == "__main__":
    run_cli(extract, "extract_pdf.py", {"pdfplumber": "pdfplumber", "pypdf": "pypdf"})

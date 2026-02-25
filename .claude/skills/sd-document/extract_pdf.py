#!/usr/bin/env python3
"""PDF 파일에서 텍스트, 표, 이미지를 페이지별로 추출한다."""

import sys
import io
import subprocess
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def ensure_packages():
    packages = {"pdfplumber": "pdfplumber", "pypdf": "pypdf"}
    for pip_name, import_name in packages.items():
        try:
            __import__(import_name)
        except ImportError:
            print(f"패키지 설치 중: {pip_name}...", file=sys.stderr)
            subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def extract(file_path):
    import pdfplumber
    from pypdf import PdfReader

    stem = Path(file_path).stem
    out_dir = Path(file_path).parent / f"{stem}_files"
    img_idx = 0
    total_text_len = 0

    print(f"# {Path(file_path).name}\n")

    # 텍스트 + 표 추출 (pdfplumber)
    with pdfplumber.open(file_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"## Page {page_num}\n")

            text = page.extract_text()
            if text and text.strip():
                total_text_len += len(text.strip())
                print(text.strip())
                print()

            tables = page.extract_tables()
            for t_idx, table in enumerate(tables):
                if table:
                    print(f"### Table {t_idx + 1}\n")
                    for row in table:
                        cells = [(c or "").strip().replace("\n", " ") for c in row]
                        print("| " + " | ".join(cells) + " |")
                    print()

    # 이미지 추출 (pypdf)
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
                ext = "png"
                if "/DCTDecode" in str(filters):
                    ext = "jpg"
                elif "/JPXDecode" in str(filters):
                    ext = "jp2"
                out_dir.mkdir(parents=True, exist_ok=True)
                img_path = out_dir / f"img_{img_idx:03d}.{ext}"
                try:
                    img_path.write_bytes(obj.get_data())
                except Exception:
                    img_path = out_dir / f"img_{img_idx:03d}.bin"
                    img_path.write_bytes(obj._data if hasattr(obj, "_data") else b"")
                print(f"[IMG] (page={page_num}) {img_path}")

    # OCR 안내
    if total_text_len == 0:
        print("\n⚠ 텍스트가 추출되지 않았습니다 (스캔 PDF일 수 있음).")
        print("OCR이 필요합니다:")
        print("  1. Tesseract OCR 설치: https://github.com/tesseract-ocr/tesseract")
        print("  2. pip install pytesseract pdf2image")
        print("  3. pytesseract.image_to_string() 으로 추출")

    print()
    if img_idx > 0:
        print(f"---\n이미지 {img_idx}개 저장: {out_dir}")
    else:
        print("---\n이미지 없음")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_pdf.py <file.pdf>", file=sys.stderr)
        sys.exit(1)
    ensure_packages()
    extract(sys.argv[1])

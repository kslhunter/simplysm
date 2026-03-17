#!/usr/bin/env python3
"""Unified document extractor with recursive embedded file extraction."""

import sys
import os
import importlib
from pathlib import Path

# Add script directory to path for relative imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from _common import setup_encoding, fmt_size, save_image, save_embedded

setup_encoding()

HANDLERS = {
    ".docx": "_extract_docx",
    ".xlsx": "_extract_xlsx",
    ".xlsb": "_extract_xlsb",
    ".pptx": "_extract_pptx",
    ".pdf": "_extract_pdf",
    ".eml": "_extract_email",
    ".msg": "_extract_email",
}

SUPPORTED_EXTENSIONS = set(HANDLERS.keys())


def extract_recursive(file_path: Path, out_dir: Path):
    """Extract file contents and recursively process embedded files."""
    ext = file_path.suffix.lower()
    handler = importlib.import_module(HANDLERS[ext])
    result = handler.extract(str(file_path))

    out_dir.mkdir(parents=True, exist_ok=True)

    # Save images
    saved_images = []
    for i, img in enumerate(result["images"], 1):
        img_path = save_image(out_dir, i, img["data"], img["ext"])
        saved_images.append({
            "filename": img_path.name,
            "size": len(img["data"]),
            "context": img.get("context", ""),
        })

    # Save embedded/attached files and recurse
    prefix = "attachment" if result.get("metadata", {}).get("email_headers") else "embedded"
    saved_embedded = []
    for i, emb in enumerate(result["embedded"], 1):
        emb_path = save_embedded(out_dir, i, emb["filename"], emb["data"], prefix)
        entry = {
            "filename": emb_path.name,
            "original_name": emb["filename"],
            "size": len(emb["data"]),
            "recursed": False,
        }

        emb_ext = Path(emb["filename"]).suffix.lower()
        if emb_ext in SUPPORTED_EXTENSIONS:
            sub_out = out_dir / f"{emb_path.stem}_files"
            try:
                extract_recursive(emb_path, sub_out)
                entry["recursed"] = True
            except Exception as e:
                print(f"Warning: Failed to extract {emb['filename']}: {e}", file=sys.stderr)

        saved_embedded.append(entry)

    # Generate index.md
    _generate_index_md(out_dir, file_path, result, saved_images, saved_embedded)


def _generate_index_md(out_dir: Path, file_path: Path, result: dict,
                       saved_images: list, saved_embedded: list):
    """Generate index.md summarizing the extraction results."""
    lines = []

    # Header
    lines.append(f"# {file_path.name}\n")
    file_size = file_path.stat().st_size if file_path.exists() else 0
    lines.append("| 속성 | 값 |")
    lines.append("|------|-----|")
    lines.append(f"| 포맷 | {file_path.suffix} |")
    lines.append(f"| 크기 | {fmt_size(file_size)} |")
    lines.append("")

    # Email headers (if present)
    email_headers = result.get("metadata", {}).get("email_headers")
    if email_headers:
        lines.append("## 메일 헤더\n")
        lines.append("| 필드 | 값 |")
        lines.append("|------|-----|")
        for key in ["subject", "from", "to", "cc", "date"]:
            val = email_headers.get(key, "")
            if val:
                lines.append(f"| {key.title()} | {val} |")
        lines.append("")

    # Body text
    text = result.get("text", "").strip()
    if text:
        lines.append("## 본문\n")
        if len(text) > 10000:
            body_path = out_dir / "body.txt"
            body_path.write_text(text, encoding="utf-8")
            lines.append(f"[body.txt](body.txt) 참조 ({fmt_size(len(text.encode('utf-8')))})\n")
        else:
            lines.append(text)
            lines.append("")

    # Extracted files table
    all_files = saved_images + saved_embedded
    if all_files:
        lines.append("## 추출 파일\n")
        lines.append("| # | 파일 | 타입 | 크기 |")
        lines.append("|---|------|------|------|")
        idx = 0
        for img in saved_images:
            idx += 1
            lines.append(f"| {idx} | {img['filename']} | 이미지 | {fmt_size(img['size'])} |")
        for emb in saved_embedded:
            idx += 1
            name = emb["filename"]
            if emb["recursed"]:
                stem = Path(name).stem
                link = f"[{name}]({stem}_files/index.md)"
            else:
                link = name
            ext = Path(emb["original_name"]).suffix.lower()
            type_label = _ext_to_type_label(ext)
            lines.append(f"| {idx} | {link} | {type_label} | {fmt_size(emb['size'])} |")
        lines.append("")

    index_path = out_dir / "index.md"
    index_path.write_text("\n".join(lines), encoding="utf-8")


def _ext_to_type_label(ext: str) -> str:
    labels = {
        ".docx": "Word", ".xlsx": "Excel", ".xlsb": "Excel (Binary)",
        ".pptx": "PowerPoint", ".pdf": "PDF",
        ".eml": "Email", ".msg": "Email",
        ".zip": "Archive", ".7z": "Archive", ".tar": "Archive",
        ".jpg": "이미지", ".jpeg": "이미지", ".png": "이미지",
        ".gif": "이미지", ".bmp": "이미지",
    }
    return labels.get(ext, "파일")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract.py <file>", file=sys.stderr)
        sys.exit(1)

    file_path = Path(sys.argv[1])
    if not file_path.exists():
        print(f"File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        print(f"Unsupported format: {ext}", file=sys.stderr)
        print(f"Supported: {', '.join(sorted(SUPPORTED_EXTENSIONS))}", file=sys.stderr)
        sys.exit(1)

    out_dir = file_path.parent / f"{file_path.stem}_files"
    extract_recursive(file_path, out_dir)
    print(str(out_dir / "index.md"))

#!/usr/bin/env python3
"""DOCX 파일에서 텍스트와 이미지를 문단 흐름 순서로 추출한다."""

import sys
import io
import os
import subprocess
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def ensure_packages():
    packages = {"python-docx": "docx"}
    for pip_name, import_name in packages.items():
        try:
            __import__(import_name)
        except ImportError:
            print(f"패키지 설치 중: {pip_name}...", file=sys.stderr)
            subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def extract(file_path):
    from docx import Document
    from docx.oxml.ns import qn

    doc = Document(file_path)
    stem = Path(file_path).stem
    out_dir = Path(file_path).parent / f"{stem}_files"
    img_idx = 0

    print(f"# {Path(file_path).name}\n")

    for i, para in enumerate(doc.paragraphs):
        has_image = False
        for run in para.runs:
            drawings = run._element.findall(f".//{qn('wp:inline')}") + run._element.findall(f".//{qn('wp:anchor')}")
            for drawing in drawings:
                blip = drawing.find(f".//{qn('a:blip')}")
                if blip is not None:
                    embed = blip.get(qn("r:embed"))
                    if embed:
                        rel = doc.part.rels.get(embed)
                        if rel:
                            img_idx += 1
                            blob = rel.target_part.blob
                            content_type = rel.target_part.content_type
                            ext = content_type.split("/")[-1].replace("jpeg", "jpg")
                            out_dir.mkdir(parents=True, exist_ok=True)
                            img_path = out_dir / f"img_{img_idx:03d}.{ext}"
                            img_path.write_bytes(blob)
                            print(f"[IMG] {img_path}")
                            has_image = True

        text = para.text.strip()
        if text:
            style = para.style.name if para.style else ""
            prefix = ""
            if "Heading" in style:
                level = style.replace("Heading ", "").replace("Heading", "1")
                try:
                    prefix = "#" * int(level) + " "
                except ValueError:
                    prefix = "## "
            print(f"{prefix}{text}")

        if has_image or text:
            pass  # already printed
        elif not has_image and not text:
            continue

    # 표 추출
    for t_idx, table in enumerate(doc.tables):
        print(f"\n### Table {t_idx + 1}\n")
        for row in table.rows:
            cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
            print("| " + " | ".join(cells) + " |")

    if img_idx > 0:
        print(f"\n---\n이미지 {img_idx}개 저장: {out_dir}")
    else:
        print("\n---\n이미지 없음")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_docx.py <file.docx>", file=sys.stderr)
        sys.exit(1)
    ensure_packages()
    extract(sys.argv[1])

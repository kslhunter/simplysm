"""PDF 핸들러. PyMuPDF (fitz) 로 페이지별 PNG + MD + embedded files 추출."""
from __future__ import annotations

import os
from pathlib import Path

from . import _common
from .dispatch import maybe_recurse_attachment


def run(input_path: Path, out_dir: Path) -> None:
    import fitz  # PyMuPDF

    pages_dir = out_dir / "pages"
    _common.mkdir(pages_dir)

    doc = fitz.open(_common.long_str(input_path))
    try:
        page_summaries: list[str] = []
        for i, page in enumerate(doc, start=1):
            idx = f"{i:03d}"
            text = page.get_text("text") or ""
            _common.write_text(pages_dir / f"{idx}.md", text)
            pix = page.get_pixmap(dpi=300)
            pix.save(_common.long_str(pages_dir / f"{idx}.png"))
            page_summaries.append(f"`pages/{idx}.png` (시각) — `.md` ({len(text)}자)")

        # 임베드된 첨부 (embedded files)
        attachment_links: list[str] = []
        attachments_dir = out_dir / "attachments"
        try:
            count = doc.embfile_count()
        except AttributeError:
            count = 0
        for i in range(count):
            try:
                info = doc.embfile_info(i)
                data = doc.embfile_get(i)
            except Exception:
                continue
            filename = info.get("filename", f"embedded_{i}.bin") if isinstance(info, dict) else f"embedded_{i}.bin"
            _common.mkdir(attachments_dir)
            dst = _common.unique_path(attachments_dir, filename)
            _common.write_bytes(dst, data)
            recursed = maybe_recurse_attachment(dst, attachments_dir)
            if recursed is not None:
                try:
                    os.unlink(_common.long_str(dst))
                except OSError:
                    pass
                attachment_links.append(f"attachments/{recursed.name}/")
            else:
                attachment_links.append(f"attachments/{dst.name}")
    finally:
        doc.close()

    _common.write_readme(
        out_dir,
        source_name=input_path.name,
        source_size=input_path.stat().st_size,
        tool="PyMuPDF (fitz)",
        loss_notes="PDF 양식 필드(form field)는 텍스트 추출에 포함되지 않을 수 있음. 의심 시 _source.pdf 직접 확인.",
        sections={f"페이지 (총 {len(page_summaries)}개)": page_summaries[:50]} if page_summaries else None,
        attachments=attachment_links,
    )

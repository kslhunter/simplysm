"""PDF 핸들러. PyMuPDF (fitz) 로 페이지별 PNG + 블록 단위 JSONL + 표 셀 단위 노드.

블록 단위 (text_block, image_block) 는 bbox 좌표 보존. 표는 find_tables() 로 셀 단위 노드.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from . import _common
from .dispatch import maybe_recurse_attachment


def run(input_path: Path, out_dir: Path) -> None:
    _common.ensure_pip("fitz", "PyMuPDF")
    import fitz  # PyMuPDF

    pages_dir = out_dir / "pages"
    images_dir = out_dir / "images"
    _common.mkdir(pages_dir)

    doc = fitz.open(_common.long_str(input_path))
    try:
        page_summaries: list[str] = []
        for i, page in enumerate(doc, start=1):
            idx = f"{i:03d}"
            pix = page.get_pixmap(dpi=300)
            pix.save(_common.long_str(pages_dir / f"{idx}.png"))

            jsonl_lines, counts = _pdf_page_to_jsonl(page, i, images_dir)
            _common.write_text(pages_dir / f"{idx}.jsonl", "\n".join(jsonl_lines))

            parts = [
                f"`pages/{idx}.png` `.jsonl`",
                f"blocks {counts['text_blocks'] + counts['image_blocks']}",
            ]
            if counts["tables"]:
                parts.append(
                    f"tables {counts['tables']} (cells {counts['table_cells']})"
                )
            if counts["form_fields"]:
                parts.append(f"form_fields {counts['form_fields']}")
            if counts["annotations"]:
                parts.append(f"annotations {counts['annotations']}")
            page_summaries.append(" — ".join([parts[0], ", ".join(parts[1:])]))

        # 임베드된 첨부 (embedded files)
        attachment_links: list[str] = []
        attachments_dir = out_dir / "attachments"
        count = doc.embfile_count()
        for i in range(count):
            info = doc.embfile_info(i)
            data = doc.embfile_get(i)
            filename = (
                info.get("filename", f"embedded_{i}.bin")
                if isinstance(info, dict)
                else f"embedded_{i}.bin"
            )
            _common.mkdir(attachments_dir)
            dst = _common.unique_path(attachments_dir, filename)
            _common.write_bytes(dst, data)
            size = dst.stat().st_size
            recursed = maybe_recurse_attachment(dst, attachments_dir)
            if recursed is not None:
                os.unlink(_common.long_str(dst))
                attachment_links.append(
                    f"attachments/{recursed.name}/ ({_common.format_size(size)})"
                )
            else:
                attachment_links.append(
                    f"attachments/{dst.name} ({_common.format_size(size)})"
                )
    finally:
        doc.close()

    _common.write_readme(
        out_dir,
        source_name=input_path.name,
        source_size=input_path.stat().st_size,
        tool="PyMuPDF (fitz)",
        loss_notes=(
            "서명, OCR 미적용(스캔 PDF 는 image_block 만 추출). "
            "양식 필드(form field), 주석(annotation)은 jsonl 에 노드로 추출됨. "
            "구조는 pages/<NNN>.jsonl (블록 bbox + 표 셀 단위 노드), 시각은 .png. "
            "이미지 블록은 images/ 로 별도 저장."
        ),
        sections={f"페이지 (총 {len(page_summaries)}개)": page_summaries}
        if page_summaries
        else None,
        attachments=attachment_links,
    )


def _pdf_page_to_jsonl(
    page,
    page_num: int,
    images_dir: Path,
) -> tuple[list[str], dict[str, int]]:
    """한 PDF 페이지 → jsonl 라인 list + counts.

    추출:
    1. get_text("dict") 의 모든 블록 (text_block, image_block) — 표 영역 겹쳐도 그대로 보존
    2. find_tables() 로 표 셀 단위 노드 추가 (블록과 중복 가능, Claude 가 양쪽 비교 판단)
    3. page.widgets() 로 form field 노드 (양식 입력란)
    4. page.annots() 로 annotation 노드 (주석, highlight, sticky note)
    """
    counts = {
        "text_blocks": 0,
        "image_blocks": 0,
        "tables": 0,
        "table_cells": 0,
        "form_fields": 0,
        "annotations": 0,
    }

    # 블록 추출 (모든 블록 보존)
    page_dict = page.get_text("dict")
    blocks = page_dict.get("blocks", [])

    node_lines: list[dict] = []
    block_idx = 0
    for blk in blocks:
        btype = blk.get("type", 0)
        bbox = blk.get("bbox", [0, 0, 0, 0])

        if btype == 0:
            text_lines: list[str] = []
            for line in blk.get("lines", []):
                spans = line.get("spans", [])
                line_text = "".join(span.get("text", "") for span in spans)
                text_lines.append(line_text)
            text = "\n".join(text_lines)
            node_lines.append(
                {
                    "page": page_num,
                    "block": block_idx,
                    "type": "text_block",
                    "bbox": list(bbox),
                    "text": text,
                }
            )
            counts["text_blocks"] += 1
            block_idx += 1
        elif btype == 1:
            img_bytes = blk.get("image")
            ext = (blk.get("ext") or "bin").lstrip(".")
            ref = ""
            if img_bytes:
                _common.mkdir(images_dir)
                img_filename = f"p{page_num:03d}_b{block_idx:03d}.{ext}"
                _common.write_bytes(images_dir / img_filename, img_bytes)
                ref = f"images/{img_filename}"
            node_lines.append(
                {
                    "page": page_num,
                    "block": block_idx,
                    "type": "image_block",
                    "bbox": list(bbox),
                    "ref": ref,
                }
            )
            counts["image_blocks"] += 1
            block_idx += 1

    # 표 셀 노드 (find_tables, 블록과 중복 가능 — 양쪽 다 보존)
    finder = page.find_tables()
    tables = list(finder.tables) if hasattr(finder, "tables") else list(finder)
    counts["tables"] = len(tables)

    for t_idx, tab in enumerate(tables, start=1):
        rows = tab.extract()
        t_bbox = [round(c, 2) for c in tab.bbox]
        for r_idx, row in enumerate(rows, start=1):
            for c_idx, cell_text in enumerate(row, start=1):
                if cell_text is None:
                    continue
                node_lines.append(
                    {
                        "page": page_num,
                        "type": "table_cell",
                        "table_idx": t_idx,
                        "table_bbox": t_bbox,
                        "row": r_idx,
                        "col": c_idx,
                        "text": str(cell_text),
                    }
                )
                counts["table_cells"] += 1

    # form fields (양식 입력란)
    widgets = page.widgets() or []
    for widget in widgets:
        rect = list(widget.rect)
        value = widget.field_value
        if value is None:
            value = ""
        field_type = widget.field_type_string or str(widget.field_type)
        name = widget.field_name or ""
        node_lines.append(
            {
                "page": page_num,
                "type": "form_field",
                "name": name,
                "field_type": field_type,
                "value": str(value),
                "bbox": rect,
            }
        )
        counts["form_fields"] += 1

    # annotations (주석, highlight, sticky note 등)
    annots = page.annots() or []
    for annot in annots:
        rect = list(annot.rect)
        atype = annot.type
        subtype = (
            atype[1]
            if isinstance(atype, (tuple, list)) and len(atype) > 1
            else str(atype)
        )
        info = annot.info or {}
        node = {
            "page": page_num,
            "type": "annotation",
            "subtype": subtype,
            "bbox": rect,
        }
        content = info.get("content")
        if content:
            node["content"] = content
        author = info.get("title")  # info["title"] = author
        if author:
            node["author"] = author
        subject = info.get("subject")
        if subject:
            node["subject"] = subject
        node_lines.append(node)
        counts["annotations"] += 1

    meta = {
        "_meta": {
            "page": page_num,
            "size": [page.rect.width, page.rect.height],
            "blocks": counts["text_blocks"] + counts["image_blocks"],
            "tables": counts["tables"],
            "table_cells": counts["table_cells"],
            "form_fields": counts["form_fields"],
            "annotations": counts["annotations"],
        }
    }
    lines = [json.dumps(meta, ensure_ascii=False)]
    for n in node_lines:
        lines.append(json.dumps(n, ensure_ascii=False))
    return lines, counts

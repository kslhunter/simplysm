"""MSG (Outlook) 핸들러. extract-msg 라이브러리 사용."""
from __future__ import annotations

import json
import os
from pathlib import Path

from . import _common
from .dispatch import maybe_recurse_attachment


def run(input_path: Path, out_dir: Path) -> None:
    _common.ensure_pip("extract_msg", "extract-msg")
    import extract_msg

    msg = extract_msg.Message(str(input_path))
    try:
        headers = {
            "From": msg.sender or "",
            "To": msg.to or "",
            "Cc": msg.cc or "",
            "Subject": msg.subject or "",
            "Date": str(msg.date) if msg.date else "",
        }
        _common.write_text(
            out_dir / "headers.json",
            json.dumps(headers, ensure_ascii=False, indent=2),
        )

        body_text = msg.body or ""
        body_html_raw = getattr(msg, "htmlBody", None)
        body_html: str | None = None
        if body_html_raw:
            if isinstance(body_html_raw, bytes):
                body_html = _common.decode_bytes(body_html_raw)
            else:
                body_html = body_html_raw

        body_inline = None
        body_file_link = None
        body_html_link = None
        if body_text:
            if len(body_text) < 1000:
                body_inline = body_text
            else:
                _common.write_text(out_dir / "body.md", body_text)
                body_file_link = "body.md"
        if body_html:
            _common.write_text(out_dir / "body.html", body_html)
            body_html_link = "body.html"

        attachments_dir = out_dir / "attachments"
        attachment_links: list[str] = []
        for att in msg.attachments:
            _common.mkdir(attachments_dir)
            filename = (
                getattr(att, "longFilename", None)
                or getattr(att, "shortFilename", None)
                or "attachment.bin"
            )
            data = att.data
            if isinstance(data, str):
                data = data.encode("utf-8")
            elif data is None:
                data = b""
            dst = _common.unique_path(attachments_dir, filename)
            _common.write_bytes(dst, data)
            recursed = maybe_recurse_attachment(dst, attachments_dir)
            if recursed is not None:
                os.unlink(_common.long_str(dst))
                attachment_links.append(f"attachments/{recursed.name}/")
            else:
                attachment_links.append(f"attachments/{dst.name}")

        _common.write_readme(
            out_dir,
            source_name=input_path.name,
            source_size=input_path.stat().st_size,
            tool="extract-msg",
            loss_notes="없음 (Outlook 본문 + 헤더 + 첨부 보존)",
            body_inline=body_inline,
            body_file_link=body_file_link,
            body_html_link=body_html_link,
            headers=headers,
            attachments=attachment_links,
        )
    finally:
        msg.close()

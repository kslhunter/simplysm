"""EML 핸들러. 표준 라이브러리 email 모듈 사용."""
from __future__ import annotations

import email
import hashlib
import json
import os
from email.header import decode_header, make_header
from pathlib import Path

from . import _common
from .dispatch import maybe_recurse_attachment


def _decode_header(raw: str | None) -> str:
    if not raw:
        return ""
    try:
        return str(make_header(decode_header(raw)))
    except Exception:
        return raw


def _decode_payload(part) -> str:
    payload = part.get_payload(decode=True) or b""
    charset = part.get_content_charset() or "utf-8"
    try:
        return payload.decode(charset, errors="replace")
    except LookupError:
        return payload.decode("utf-8", errors="replace")


def run(input_path: Path, out_dir: Path) -> None:
    raw = input_path.read_bytes()
    msg = email.message_from_bytes(raw)

    headers = {
        "From": _decode_header(msg.get("From")),
        "To": _decode_header(msg.get("To")),
        "Cc": _decode_header(msg.get("Cc")),
        "Subject": _decode_header(msg.get("Subject")),
        "Date": _decode_header(msg.get("Date")),
        "Message-ID": _decode_header(msg.get("Message-ID")),
    }
    _common.write_text(
        out_dir / "headers.json",
        json.dumps(headers, ensure_ascii=False, indent=2),
    )

    body_text: str | None = None
    body_html: str | None = None
    attachments_dir = out_dir / "attachments"
    saved_attachments: list[Path] = []
    seen_hashes: set[str] = set()

    for part in msg.walk():
        if part.is_multipart():
            continue
        ctype = part.get_content_type()
        disp = (part.get("Content-Disposition") or "").lower()
        filename = part.get_filename()
        if filename:
            filename = _decode_header(filename)

        is_attachment = bool(filename) or "attachment" in disp

        if is_attachment:
            payload = part.get_payload(decode=True) or b""
            digest = hashlib.md5(payload).hexdigest()
            if digest in seen_hashes:
                # 같은 콘텐츠가 multipart 다른 위치에 중복 등장한 경우 (Outlook inline+attachment 등) 한 번만 저장.
                continue
            seen_hashes.add(digest)
            _common.mkdir(attachments_dir)
            dst = _common.unique_path(attachments_dir, filename or "attachment.bin")
            _common.write_bytes(dst, payload)
            saved_attachments.append(dst)
        elif ctype == "text/plain" and body_text is None:
            body_text = _decode_payload(part)
        elif ctype == "text/html" and body_html is None:
            body_html = _decode_payload(part)

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

    attachment_links: list[str] = []
    for ap in saved_attachments:
        recursed = maybe_recurse_attachment(ap, attachments_dir)
        if recursed is not None:
            try:
                os.unlink(_common.long_str(ap))
            except OSError:
                pass
            attachment_links.append(f"attachments/{recursed.name}/")
        else:
            attachment_links.append(f"attachments/{ap.name}")

    _common.write_readme(
        out_dir,
        source_name=input_path.name,
        source_size=input_path.stat().st_size,
        tool="email (표준 라이브러리)",
        loss_notes="없음 (이메일 본문 텍스트는 손실 없이 보존됨)",
        body_inline=body_inline,
        body_file_link=body_file_link,
        body_html_link=body_html_link,
        headers=headers,
        attachments=attachment_links,
    )

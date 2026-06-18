"""EML 핸들러. 표준 라이브러리 email 모듈 사용.

본문 일관화:
- text/plain 있으면 그걸 body.md
- text/plain 없고 text/html 있으면 HTML → 평문 변환(html2text) → body.md
- HTML 변환 시 inline image (cid:) → 첨부 파일명 placeholder 치환

CID 매핑:
- Content-ID 헤더 있는 첨부는 cid_map 에 등록
- images.rels.json 으로 CID↔파일명 양방향 추적
"""
from __future__ import annotations

import email
import hashlib
import json
import os
import re
from email.header import decode_header, make_header
from pathlib import Path

from . import _common
from .dispatch import maybe_recurse_attachment


def _decode_header(raw: str | None) -> str:
    if not raw:
        return ""
    return str(make_header(decode_header(raw)))


def _decode_payload(part) -> str:
    payload = part.get_payload(decode=True) or b""
    if not payload:
        return ""
    return _common.decode_bytes(payload)


def run(input_path: Path, out_dir: Path) -> None:
    raw = input_path.read_bytes()
    msg = email.message_from_bytes(raw)

    # 모든 헤더 보존 (envelope·X-* 등 원본 그대로). 동일 키 다수 등장 → list 누적.
    headers: dict = {}
    for key, raw in msg.items():
        decoded = _decode_header(raw)
        if key in headers:
            existing = headers[key]
            if isinstance(existing, list):
                existing.append(decoded)
            else:
                headers[key] = [existing, decoded]
        else:
            headers[key] = decoded
    _common.write_text(
        out_dir / "headers.json",
        json.dumps(headers, ensure_ascii=False, indent=2),
    )

    # README 의 헤더 섹션 표기용 envelope 키 (write_readme 의 dict 출력 한정)
    envelope_keys = [
        "From", "To", "Cc", "Bcc", "Subject", "Date", "Message-ID",
        "Reply-To", "In-Reply-To", "References",
    ]
    readme_headers = {k: headers.get(k, "") for k in envelope_keys}

    body_text: str | None = None
    body_html: str | None = None
    attachments_dir = out_dir / "attachments"
    saved_attachments: list[Path] = []
    seen_hashes: set[str] = set()
    cid_map: dict[str, str] = {}  # cid (without <>) → 첨부 파일명 (basename)

    for part in msg.walk():
        if part.is_multipart():
            continue
        ctype = part.get_content_type()
        disp = (part.get("Content-Disposition") or "").lower()
        filename = part.get_filename()
        if filename:
            filename = _decode_header(filename)
        cid_raw = (part.get("Content-ID") or "").strip()
        cid = cid_raw.strip("<>") if cid_raw else ""

        is_attachment = bool(filename) or "attachment" in disp or bool(cid)

        if is_attachment:
            payload = part.get_payload(decode=True) or b""
            digest = hashlib.md5(payload).hexdigest()
            if digest in seen_hashes:
                # 같은 콘텐츠가 multipart 다른 위치에 중복 등장한 경우 (Outlook inline+attachment 등) 한 번만 저장.
                continue
            seen_hashes.add(digest)
            _common.mkdir(attachments_dir)
            dst_name = filename or (f"{cid}.bin" if cid else "attachment.bin")
            dst = _common.unique_path(attachments_dir, dst_name)
            _common.write_bytes(dst, payload)
            saved_attachments.append(dst)
            if cid:
                cid_map[cid] = dst.name
        elif ctype == "text/plain" and body_text is None:
            body_text = _decode_payload(part)
        elif ctype == "text/html" and body_html is None:
            body_html = _decode_payload(part)

    # body.md: text/plain 우선, 없으면 HTML→평문
    # body.from_html.md: HTML 있으면 항상 별도 생성 (인라인 이미지 위치 placeholder 포함)
    if body_text:
        body_md = body_text
    elif body_html:
        body_md = _html_to_md(body_html, cid_map)
    else:
        body_md = ""

    body_file_link = None
    body_html_link = None
    body_from_html_link = None
    if body_md:
        _common.write_text(out_dir / "body.md", body_md)
        body_file_link = "body.md"
    if body_html:
        _common.write_text(out_dir / "body.html", body_html)
        body_html_link = "body.html"
        # text/plain 우선 정책으로 body.md 가 plain 인 경우, HTML→평문 변환본도 별도로
        # 보존 (인라인 이미지 위치 단서). body.md 자체가 from_html 이면 중복 회피.
        if body_text:
            from_html_md = _html_to_md(body_html, cid_map)
            _common.write_text(out_dir / "body.from_html.md", from_html_md)
            body_from_html_link = "body.from_html.md"

    # CID↔파일명 매핑 (인라인 이미지 있을 때만)
    if cid_map:
        rels = {cid: f"attachments/{fname}" for cid, fname in cid_map.items()}
        _common.write_text(
            out_dir / "images.rels.json",
            json.dumps(rels, ensure_ascii=False, indent=2),
        )

    # TNEF (winmail.dat) 풀이 — Outlook RTF 메일의 첨부 패키지 안 내부 첨부 추출
    tnef_saved: list[Path] = []
    for ap in saved_attachments:
        extra = _common.unpack_tnef(ap, attachments_dir)
        tnef_saved.extend(extra)
    saved_attachments.extend(tnef_saved)

    attachment_links: list[str] = []
    for ap in saved_attachments:
        size = ap.stat().st_size
        recursed = maybe_recurse_attachment(ap, attachments_dir)
        if recursed is not None:
            os.unlink(_common.long_str(ap))
            attachment_links.append(f"attachments/{recursed.name}/ ({_common.format_size(size)})")
        else:
            attachment_links.append(f"attachments/{ap.name} ({_common.format_size(size)})")

    _common.write_readme(
        out_dir,
        source_name=input_path.name,
        source_size=input_path.stat().st_size,
        tool="email (표준 라이브러리) + html2text",
        loss_notes=(
            "본문은 body.md (text/plain 우선, 없으면 HTML→평문). "
            "text/plain·HTML 둘 다 있을 때 HTML→평문(인라인 이미지 위치 placeholder 포함)은 body.from_html.md 별도. "
            "원본 HTML 은 body.html, CID↔첨부 매핑은 images.rels.json (인라인 이미지 있을 때)."
        ),
        body_file_link=body_file_link,
        body_html_link=body_html_link,
        body_from_html_link=body_from_html_link,
        headers=readme_headers,
        attachments=attachment_links,
    )


def _html_to_md(html: str, cid_map: dict[str, str]) -> str:
    """HTML 본문 → 평문 md 변환. cid: 이미지 src 는 첨부 파일명 placeholder 로 치환."""
    _common.ensure_pip("html2text")
    import html2text

    h = html2text.HTML2Text()
    h.body_width = 0
    h.ignore_links = False
    h.ignore_images = False
    md = h.handle(html)

    # 1) `![alt](cid:XXX)` → `![<filename>](attachments/<filename>)`
    def replace_cid_img(m: re.Match) -> str:
        alt, cid_value = m.group(1), m.group(2).strip()
        fname = cid_map.get(cid_value) or cid_map.get(cid_value.split("@")[0])
        if fname:
            return f"![{fname}](attachments/{fname})"
        return f"![{alt}](cid:{cid_value})"

    md = re.sub(r"!\[([^\]]*)\]\(cid:([^)]+)\)", replace_cid_img, md)
    return md

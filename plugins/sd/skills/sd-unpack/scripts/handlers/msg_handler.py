"""MSG (Outlook) 핸들러. extract-msg 라이브러리 사용.

본문, CID, envelope 헤더 규약은 eml_handler 와 동일.
"""

from __future__ import annotations

import email as stdemail
import json
import os
import re
from pathlib import Path

from . import _common
from .dispatch import maybe_recurse_attachment


def run(input_path: Path, out_dir: Path) -> None:
    _common.ensure_pip("extract_msg", "extract-msg")
    import extract_msg

    # long path(260자 초과) 대응 — 경로 문자열 대신 바이트로 넘긴다.
    with open(_common.long_str(input_path), "rb") as f:
        msg = extract_msg.Message(f.read())
    try:
        raw_header = getattr(msg, "header", None) or ""
        # extract-msg 일부 버전 header 는 EmailMessage 객체 — str() 로 정규화
        if not isinstance(raw_header, str):
            raw_header = str(raw_header)

        # 모든 헤더 보존: msg.header 의 raw RFC822 파싱 + extract-msg 의 정형 필드 보강
        headers: dict = {}
        if raw_header:
            parsed = stdemail.message_from_string(raw_header)
            for key, raw_value in parsed.items():
                # raw header 값은 RFC2047 인코딩워드 상태 — eml 과 동일하게 디코드해 보관
                val = _common.decode_mime_header(raw_value)
                if key in headers:
                    existing = headers[key]
                    if isinstance(existing, list):
                        existing.append(val)
                    else:
                        headers[key] = [existing, val]
                else:
                    headers[key] = val
        # extract-msg 정형 필드 (raw header 없을 때 fallback)
        if not headers:
            headers = {
                "From": msg.sender or "",
                "To": msg.to or "",
                "Cc": msg.cc or "",
                "Bcc": getattr(msg, "bcc", "") or "",
                "Subject": msg.subject or "",
                "Date": str(msg.date) if msg.date else "",
            }
        _common.write_text(
            out_dir / "headers.json",
            json.dumps(headers, ensure_ascii=False, indent=2),
        )

        envelope_keys = [
            "From",
            "To",
            "Cc",
            "Bcc",
            "Subject",
            "Date",
            "Message-ID",
            "Reply-To",
            "In-Reply-To",
            "References",
        ]
        readme_headers: dict = {}
        for k in envelope_keys:
            v = headers.get(k)
            if v:
                readme_headers[k] = v
        # extract-msg 정형 필드로 envelope 보강 (raw header 에 없을 때)
        if not readme_headers.get("From"):
            readme_headers["From"] = msg.sender or ""
        if not readme_headers.get("To"):
            readme_headers["To"] = msg.to or ""
        if not readme_headers.get("Cc"):
            readme_headers["Cc"] = msg.cc or ""
        if not readme_headers.get("Subject"):
            readme_headers["Subject"] = msg.subject or ""
        if not readme_headers.get("Date"):
            readme_headers["Date"] = str(msg.date) if msg.date else ""

        body_text = msg.body or ""
        body_html_raw = getattr(msg, "htmlBody", None)
        body_html: str | None = None
        if body_html_raw:
            if isinstance(body_html_raw, bytes):
                body_html = _common.decode_bytes(body_html_raw)
            else:
                body_html = body_html_raw

        attachments_dir = out_dir / "attachments"
        attachment_links: list[str] = []
        cid_map: dict[str, str] = {}

        for att in msg.attachments:
            _common.mkdir(attachments_dir)
            filename = (
                getattr(att, "longFilename", None)
                or getattr(att, "shortFilename", None)
                or "attachment.bin"
            )
            cid = getattr(att, "cid", None) or getattr(att, "contentId", None) or ""
            if cid:
                cid = str(cid).strip("<>")
            data = att.data
            if data is None:
                raise RuntimeError(
                    f"MSG 첨부 '{filename}' 추출 실패 (data 없음) — {input_path.name}"
                )
            if isinstance(data, str):
                data = data.encode("utf-8")
            elif hasattr(data, "exportBytes"):
                # 임베디드 메일 첨부 — extract_msg 는 bytes 가 아닌 MSGFile 객체를 준다.
                # .msg 바이트로 내보내 일반 첨부와 동일하게 저장, 재귀 풀이한다.
                data = data.exportBytes()
                if not filename.lower().endswith(".msg"):
                    subject = getattr(att, "displayName", None) or Path(filename).stem
                    filename = f"{subject}.msg"
            elif not isinstance(data, bytes):
                raise RuntimeError(
                    f"MSG 첨부 '{filename}' 추출 실패 (예상치 못한 data 타입 {type(data).__name__}) — {input_path.name}"
                )
            dst = _common.unique_path(attachments_dir, filename)
            _common.write_bytes(dst, data)
            size = dst.stat().st_size
            if cid:
                cid_map[cid] = dst.name

            # TNEF (winmail.dat) 풀이 — Outlook 첨부 패키지 안 내부 첨부 추출
            for tnef_ap in _common.unpack_tnef(dst, attachments_dir):
                t_size = tnef_ap.stat().st_size
                t_recursed = maybe_recurse_attachment(tnef_ap, attachments_dir)
                if t_recursed is not None:
                    os.unlink(_common.long_str(tnef_ap))
                    attachment_links.append(
                        f"attachments/{t_recursed.name}/ ({_common.format_size(t_size)})"
                    )
                else:
                    attachment_links.append(
                        f"attachments/{tnef_ap.name} ({_common.format_size(t_size)})"
                    )

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

        # body.md: text 우선, 없으면 HTML→평문
        # body.from_html.md: text, HTML 둘 다 있을 때 HTML→평문 변환본 별도 (이미지 위치 placeholder)
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
            if body_text:
                from_html_md = _html_to_md(body_html, cid_map)
                _common.write_text(out_dir / "body.from_html.md", from_html_md)
                body_from_html_link = "body.from_html.md"

        if cid_map:
            rels = {cid: f"attachments/{fname}" for cid, fname in cid_map.items()}
            _common.write_text(
                out_dir / "images.rels.json",
                json.dumps(rels, ensure_ascii=False, indent=2),
            )

        _common.write_readme(
            out_dir,
            source_name=input_path.name,
            source_size=input_path.stat().st_size,
            tool="extract-msg + html2text",
            loss_notes=(
                "본문은 body.md (text 우선, 없으면 HTML→평문). "
                "text, HTML 둘 다 있을 때 HTML→평문(인라인 이미지 위치 placeholder 포함)은 body.from_html.md 별도. "
                "원본 HTML 은 body.html, CID↔첨부 매핑은 images.rels.json (인라인 이미지 있을 때)."
            ),
            body_file_link=body_file_link,
            body_html_link=body_html_link,
            body_from_html_link=body_from_html_link,
            headers=readme_headers,
            attachments=attachment_links,
        )
    finally:
        msg.close()


def _html_to_md(html: str, cid_map: dict[str, str]) -> str:
    """HTML 본문 → 평문 md 변환. cid: 이미지 src 는 첨부 파일명 placeholder 로 치환."""
    _common.ensure_pip("html2text")
    import html2text

    h = html2text.HTML2Text()
    h.body_width = 0
    h.ignore_links = False
    h.ignore_images = False
    md = h.handle(html)

    def replace_cid_img(m: re.Match) -> str:
        alt, cid_value = m.group(1), m.group(2).strip()
        fname = cid_map.get(cid_value) or cid_map.get(cid_value.split("@")[0])
        if fname:
            return f"![{fname}](attachments/{fname})"
        return f"![{alt}](cid:{cid_value})"

    md = re.sub(r"!\[([^\]]*)\]\(cid:([^)]+)\)", replace_cid_img, md)
    return md

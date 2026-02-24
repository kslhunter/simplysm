#!/usr/bin/env python3
"""Email Analyzer - Parses EML/MSG files, extracts body/attachments/inline images to disk."""

import sys
import os
import io
import subprocess
import email
import html
import re
import base64
from email.policy import default as default_policy
from pathlib import Path

# stdout UTF-8 강제 (Windows 호환)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def ensure_packages():
    """필요한 패키지 자동 설치."""
    packages = {"extract-msg": "extract_msg"}
    missing = []
    for pip_name, import_name in packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pip_name)
    if missing:
        print(f"패키지 설치 중: {', '.join(missing)}...", file=sys.stderr)
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", *missing],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


ensure_packages()

import extract_msg  # noqa: E402


# ── Korean charset helpers ──────────────────────────────────────────

KOREAN_CHARSET_MAP = {
    "ks_c_5601-1987": "cp949",
    "ks_c_5601": "cp949",
    "euc_kr": "cp949",
    "euc-kr": "cp949",
}


def fix_charset(charset):
    if charset is None:
        return "utf-8"
    return KOREAN_CHARSET_MAP.get(charset.lower(), charset)


# ── Email parsing ──────────────────────────────────────────────────


def parse_email(filepath):
    """Parse email file (.eml or .msg) and return structured data."""
    ext = Path(filepath).suffix.lower()
    if ext == ".msg":
        return _parse_msg(filepath)
    return _parse_eml(filepath)


def _parse_eml(filepath):
    with open(filepath, "rb") as f:
        msg = email.message_from_binary_file(f, policy=default_policy)

    headers = {
        "subject": str(msg["Subject"] or ""),
        "from": str(msg["From"] or ""),
        "to": str(msg["To"] or ""),
        "cc": str(msg["Cc"] or ""),
        "date": str(msg["Date"] or ""),
    }

    body_plain = ""
    body_html = ""

    if msg.is_multipart():
        for part in msg.walk():
            ctype = part.get_content_type()
            cdisp = part.get_content_disposition()
            if cdisp == "attachment":
                continue
            if ctype == "text/plain" and not body_plain:
                body_plain = _get_text_eml(part)
            elif ctype == "text/html" and not body_html:
                body_html = _get_text_eml(part)
    else:
        ctype = msg.get_content_type()
        if ctype == "text/html":
            body_html = _get_text_eml(msg)
        else:
            body_plain = _get_text_eml(msg)

    attachments = []
    inline_images = []
    seen_cids = set()

    for part in msg.walk():
        payload = part.get_payload(decode=True)
        if payload is None:
            continue

        content_id = (part.get("Content-ID") or "").strip("<> ")
        ctype = part.get_content_type()
        filename = part.get_filename()

        # Inline image: Content-ID + image type
        if content_id and ctype.startswith("image/"):
            if content_id not in seen_cids:
                seen_cids.add(content_id)
                ext = _guess_image_ext(ctype, filename)
                inline_images.append({
                    "content_id": content_id,
                    "filename": filename or f"inline_{len(inline_images) + 1}{ext}",
                    "content_type": ctype,
                    "size": len(payload),
                    "data": payload,
                })
            continue

        # Regular attachment: has filename
        if not filename:
            continue
        cdisp = part.get_content_disposition()
        if cdisp not in ("attachment", "inline", None):
            continue
        attachments.append({
            "filename": filename,
            "content_type": ctype,
            "size": len(payload),
            "data": payload,
        })

    return headers, body_plain, body_html, attachments, inline_images


def _parse_msg(filepath):
    msg = extract_msg.openMsg(filepath)
    try:
        headers = {
            "subject": msg.subject or "",
            "from": msg.sender or "",
            "to": msg.to or "",
            "cc": msg.cc or "",
            "date": str(msg.date or ""),
        }

        body_plain = msg.body or ""
        raw_html = getattr(msg, "htmlBody", None)
        if isinstance(raw_html, bytes):
            body_html = raw_html.decode("utf-8", errors="replace")
        else:
            body_html = raw_html or ""

        attachments = []
        inline_images = []

        for att in (msg.attachments or []):
            data = getattr(att, "data", None)
            if data is None:
                continue
            if isinstance(data, str):
                data = data.encode("utf-8")

            filename = (
                getattr(att, "longFilename", None)
                or getattr(att, "shortFilename", None)
                or getattr(att, "name", None)
                or "unnamed"
            )
            mimetype = getattr(att, "mimetype", None) or "application/octet-stream"
            cid = getattr(att, "contentId", None) or ""

            entry = {
                "filename": filename,
                "content_type": mimetype,
                "size": len(data),
                "data": data,
            }

            if cid and mimetype.startswith("image/"):
                entry["content_id"] = cid.strip("<> ")
                inline_images.append(entry)
            else:
                attachments.append(entry)

        return headers, body_plain, body_html, attachments, inline_images
    finally:
        msg.close()


def _get_text_eml(part):
    try:
        return part.get_content()
    except Exception:
        payload = part.get_payload(decode=True)
        if not payload:
            return ""
        charset = fix_charset(part.get_content_charset())
        return payload.decode(charset, errors="replace")


def _guess_image_ext(content_type, filename=None):
    if filename:
        ext = Path(filename).suffix
        if ext:
            return ext
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/gif": ".gif",
        "image/bmp": ".bmp",
        "image/webp": ".webp",
        "image/svg+xml": ".svg",
    }
    return mapping.get(content_type, ".bin")


# ── File saving ────────────────────────────────────────────────────


def save_files(files, output_dir):
    """Save files to output directory, handling name collisions. Returns list with saved_path."""
    os.makedirs(output_dir, exist_ok=True)
    result = []
    for f in files:
        filepath = os.path.join(output_dir, f["filename"])
        if os.path.exists(filepath):
            stem = Path(filepath).stem
            ext = Path(filepath).suffix
            n = 1
            while os.path.exists(filepath):
                filepath = os.path.join(output_dir, f"{stem}_{n}{ext}")
                n += 1
        with open(filepath, "wb") as fh:
            fh.write(f["data"])
        result.append({**f, "saved_path": filepath})
    return result


def extract_data_uri_images(html_body, output_dir):
    """Extract base64 data URI images embedded in HTML body."""
    pattern = r'<img[^>]+src=["\']data:image/([^;]+);base64,([^"\']+)["\']'
    matches = re.findall(pattern, html_body, re.IGNORECASE)
    if not matches:
        return []

    os.makedirs(output_dir, exist_ok=True)
    images = []
    for i, (img_type, b64data) in enumerate(matches, 1):
        try:
            data = base64.b64decode(b64data)
            ext_map = {"jpeg": ".jpg", "svg+xml": ".svg"}
            ext = ext_map.get(img_type, f".{img_type}")
            filename = f"datauri_{i}{ext}"
            filepath = os.path.join(output_dir, filename)
            with open(filepath, "wb") as f:
                f.write(data)
            images.append({
                "filename": filename,
                "content_type": f"image/{img_type}",
                "size": len(data),
                "saved_path": filepath,
            })
        except Exception:
            continue
    return images


# ── HTML stripping ──────────────────────────────────────────────────


def strip_html(text):
    text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL | re.I)
    text = re.sub(r"<script[^>]*>.*?</script>", "", text, flags=re.DOTALL | re.I)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.I)
    text = re.sub(r"</(?:p|div|tr|li)>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ── Size formatting ─────────────────────────────────────────────────


def fmt_size(n):
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


# ── Markdown report ─────────────────────────────────────────────────


def build_report(filepath):
    headers, body_plain, body_html, attachments, inline_images = parse_email(filepath)

    out_dir = str(Path(filepath).parent / f"{Path(filepath).stem}_files")

    # Save inline images
    saved_inline = []
    if inline_images:
        saved_inline = save_files(inline_images, out_dir)

    # Extract data URI images from HTML body
    saved_datauri = []
    if body_html:
        saved_datauri = extract_data_uri_images(body_html, out_dir)

    all_inline = saved_inline + saved_datauri

    # Save attachments
    saved_attachments = []
    if attachments:
        saved_attachments = save_files(attachments, out_dir)

    out = []
    out.append("# 이메일 분석서\n")
    out.append(f"**원본 파일**: `{os.path.basename(filepath)}`\n")

    # ── 메일 정보
    out.append("## 메일 정보\n")
    out.append("| 항목 | 내용 |")
    out.append("|------|------|")
    out.append(f"| **제목** | {headers['subject']} |")
    out.append(f"| **보낸 사람** | {headers['from']} |")
    out.append(f"| **받는 사람** | {headers['to']} |")
    if headers["cc"]:
        out.append(f"| **참조** | {headers['cc']} |")
    out.append(f"| **날짜** | {headers['date']} |")
    out.append(f"| **첨부파일** | {len(saved_attachments)}개 |")
    if all_inline:
        out.append(f"| **본문 이미지** | {len(all_inline)}개 |")
    out.append("")

    # ── 본문
    out.append("## 본문 내용\n")
    body = body_plain
    if not body and body_html:
        body = strip_html(body_html)
    out.append(body.strip() if body else "_(본문 없음)_")
    out.append("")

    # ── 본문 삽입 이미지
    if all_inline:
        out.append("## 본문 삽입 이미지\n")
        out.append("| # | 파일명 | 크기 | 저장 경로 |")
        out.append("|---|--------|------|-----------|")
        for i, img in enumerate(all_inline, 1):
            out.append(f"| {i} | {img['filename']} | {fmt_size(img['size'])} | `{img['saved_path']}` |")
        out.append("")

    # ── 첨부파일
    if saved_attachments:
        out.append("## 첨부파일\n")
        out.append("| # | 파일명 | 크기 | 저장 경로 |")
        out.append("|---|--------|------|-----------|")
        for i, a in enumerate(saved_attachments, 1):
            out.append(f"| {i} | {a['filename']} | {fmt_size(a['size'])} | `{a['saved_path']}` |")
        out.append("")

    return "\n".join(out)


# ── Main ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python email-analyzer.py <eml_or_msg_file>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"파일을 찾을 수 없습니다: {path}", file=sys.stderr)
        sys.exit(1)

    ext = Path(path).suffix.lower()
    if ext not in (".eml", ".msg"):
        print(f"지원하지 않는 형식: {ext} (.eml 또는 .msg만 지원)", file=sys.stderr)
        sys.exit(1)

    print(build_report(path))

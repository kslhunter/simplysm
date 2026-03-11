#!/usr/bin/env python3
"""Email Analyzer - Parses EML/MSG files, extracts body/attachments/inline images to disk."""

import sys
import os
import io
import email
import html
import re
import base64
from email.policy import default as default_policy
from pathlib import Path

# Force stdout UTF-8 (Windows compatibility)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def ensure_packages():
    """Auto-install required packages."""
    import subprocess
    packages = {"extract-msg": "extract_msg"}
    missing = []
    for pip_name, import_name in packages.items():
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pip_name)
    if missing:
        print(f"Installing packages: {', '.join(missing)}...", file=sys.stderr)
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-q", *missing],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )


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
    attachments = []
    inline_images = []
    seen_cids = set()

    if not msg.is_multipart():
        ctype = msg.get_content_type()
        if ctype == "text/html":
            body_html = _get_text_eml(msg)
        else:
            body_plain = _get_text_eml(msg)
        return headers, body_plain, body_html, attachments, inline_images

    for part in msg.walk():
        ctype = part.get_content_type()
        cdisp = part.get_content_disposition()
        payload = part.get_payload(decode=True)

        # Body extraction (non-attachment text parts)
        if cdisp != "attachment" and payload is not None:
            if ctype == "text/plain" and not body_plain:
                body_plain = _get_text_eml(part)
            elif ctype == "text/html" and not body_html:
                body_html = _get_text_eml(part)

        if payload is None:
            continue

        content_id = (part.get("Content-ID") or "").strip("<> ")
        filename = part.get_filename()

        # Inline image
        if _is_inline_image(content_id, ctype):
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

        # Regular attachment
        if not filename:
            continue
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
    ensure_packages()
    import extract_msg

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

            if _is_inline_image(cid, mimetype):
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


def _is_inline_image(content_id, content_type):
    """Check if a MIME part is an inline image (has Content-ID + image MIME type)."""
    return bool(content_id) and content_type.startswith("image/")


# ── Pre-compiled regexes ───────────────────────────────────────────

_RE_DATA_URI = re.compile(
    r'<img[^>]+src=["\']data:image/([^;]+);base64,([^"\']+)["\']',
    re.IGNORECASE,
)
_RE_STYLE = re.compile(r"<style[^>]*>.*?</style>", re.DOTALL | re.I)
_RE_SCRIPT = re.compile(r"<script[^>]*>.*?</script>", re.DOTALL | re.I)
_RE_BR = re.compile(r"<br\s*/?>", re.I)
_RE_BLOCK_CLOSE = re.compile(r"</(?:p|div|tr|li)>", re.I)
_RE_TAG = re.compile(r"<[^>]+>")
_RE_MULTI_NEWLINE = re.compile(r"\n{3,}")


# ── File saving ────────────────────────────────────────────────────


def save_files(files, output_dir):
    """Save files to output directory, handling name collisions. Returns list with saved_path."""
    os.makedirs(output_dir, exist_ok=True)
    result = []
    for f in files:
        stem = Path(f["filename"]).stem
        ext = Path(f["filename"]).suffix
        filepath = os.path.join(output_dir, f["filename"])
        if os.path.exists(filepath):
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
    matches = _RE_DATA_URI.findall(html_body)
    if not matches:
        return []

    images = []
    for i, (img_type, b64data) in enumerate(matches, 1):
        try:
            data = base64.b64decode(b64data)
            content_type = f"image/{img_type}"
            ext = _guess_image_ext(content_type)
            images.append({
                "filename": f"datauri_{i}{ext}",
                "content_type": content_type,
                "size": len(data),
                "data": data,
            })
        except Exception:
            continue

    if not images:
        return []
    return save_files(images, output_dir)


# ── HTML stripping ──────────────────────────────────────────────────


def strip_html(text):
    text = _RE_STYLE.sub("", text)
    text = _RE_SCRIPT.sub("", text)
    text = _RE_BR.sub("\n", text)
    text = _RE_BLOCK_CLOSE.sub("\n", text)
    text = _RE_TAG.sub("", text)
    text = html.unescape(text)
    text = _RE_MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()


# ── Size formatting ─────────────────────────────────────────────────


def fmt_size(n):
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


# ── Markdown report ─────────────────────────────────────────────────


def _render_file_table(title, items):
    """Render a Markdown table of files with #, Filename, Size, Saved path columns."""
    if not items:
        return []
    lines = [
        f"## {title}\n",
        "| # | Filename | Size | Saved path |",
        "|---|--------|------|-----------|",
    ]
    for i, item in enumerate(items, 1):
        lines.append(
            f"| {i} | {item['filename']} | {fmt_size(item['size'])} | `{item['saved_path']}` |"
        )
    lines.append("")
    return lines


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
    out.append("# Email Analysis Report\n")
    out.append(f"**Source file**: `{os.path.basename(filepath)}`\n")

    # ── Email info
    out.append("## Email Info\n")
    out.append("| Field | Value |")
    out.append("|-------|-------|")
    out.append(f"| **Subject** | {headers['subject']} |")
    out.append(f"| **From** | {headers['from']} |")
    out.append(f"| **To** | {headers['to']} |")
    if headers["cc"]:
        out.append(f"| **CC** | {headers['cc']} |")
    out.append(f"| **Date** | {headers['date']} |")
    out.append(f"| **Attachments** | {len(saved_attachments)} |")
    if all_inline:
        out.append(f"| **Inline images** | {len(all_inline)} |")
    out.append("")

    # ── Body
    out.append("## Body\n")
    body = body_plain
    if not body and body_html:
        body = strip_html(body_html)
    out.append(body.strip() if body else "_(No body)_")
    out.append("")

    out.extend(_render_file_table("Inline Images", all_inline))
    out.extend(_render_file_table("Attachments", saved_attachments))

    return "\n".join(out)


# ── Main ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python email-analyzer.py <eml_or_msg_file>", file=sys.stderr)
        sys.exit(1)

    path = sys.argv[1]
    if not os.path.isfile(path):
        print(f"File not found: {path}", file=sys.stderr)
        sys.exit(1)

    ext = Path(path).suffix.lower()
    if ext not in (".eml", ".msg"):
        print(f"Unsupported format: {ext} (only .eml and .msg are supported)", file=sys.stderr)
        sys.exit(1)

    print(build_report(path))

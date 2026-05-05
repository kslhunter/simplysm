"""EML/MSG handler: extract headers, body, inline images, and attachments."""

import re
import base64
import email
from email.policy import default as default_policy
from pathlib import Path

from _common import ensure_packages, fix_charset, strip_html

_RE_DATA_URI = re.compile(
    r'<img[^>]+src=["\']data:image/([^;]+);base64,([^"\']+)["\']',
    re.IGNORECASE,
)


def extract(file_path):
    ext = Path(file_path).suffix.lower()
    if ext == ".msg":
        return _extract_msg(file_path)
    return _extract_eml(file_path)


def _extract_eml(file_path):
    with open(file_path, "rb") as f:
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
    images = []
    embedded = []
    img_idx = 0
    emb_idx = 0
    seen_cids = set()
    cid_to_idx = {}  # content_id -> img_idx

    if not msg.is_multipart():
        ctype = msg.get_content_type()
        if ctype == "text/html":
            body_html = _get_text_eml(msg)
        else:
            body_plain = _get_text_eml(msg)
    else:
        for part in msg.walk():
            ctype = part.get_content_type()
            cdisp = part.get_content_disposition()
            payload = part.get_payload(decode=True)

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
            if content_id and ctype.startswith("image/"):
                if content_id not in seen_cids:
                    seen_cids.add(content_id)
                    ext = _guess_ext(ctype, filename)
                    img_idx += 1
                    images.append({
                        "data": payload,
                        "ext": ext,
                        "context": f"inline (cid:{content_id})",
                    })
                    cid_to_idx[content_id] = img_idx
                continue

            # Regular attachment
            if not filename:
                continue
            if cdisp not in ("attachment", "inline", None):
                continue
            emb_idx += 1
            embedded.append({"filename": filename, "data": payload})

    # Replace cid references and data URI images in HTML with [IMG:N] markers
    if body_html:
        for cid, idx in cid_to_idx.items():
            body_html = re.sub(
                rf'<img[^>]+src=["\']cid:{re.escape(cid)}["\'][^>]*>',
                f'[IMG:{idx}]',
                body_html,
                flags=re.IGNORECASE,
            )

        def _replace_data_uri(m):
            nonlocal img_idx
            img_type = m.group(1)
            b64data = m.group(2)
            try:
                data = base64.b64decode(b64data)
                img_idx += 1
                images.append({
                    "data": data,
                    "ext": img_type,
                    "context": "data URI in HTML body",
                })
                return f'[IMG:{img_idx}]'
            except Exception:
                return ''

        body_html = _RE_DATA_URI.sub(_replace_data_uri, body_html)

    # Build final body text
    if body_plain:
        body = body_plain.strip()
        # plain text doesn't have image positions — append inline images at end
        if images:
            img_lines = [f"[IMG:{i}]" for i in range(1, img_idx + 1)]
            body = body + "\n\n" + "\n".join(img_lines)
    elif body_html:
        body = strip_html(body_html)  # [IMG:N] markers survive HTML stripping
    else:
        body = ""

    # Append [EMB:N] for attachments
    if embedded:
        emb_lines = [f"[EMB:{i}]" for i in range(1, emb_idx + 1)]
        body = body.strip() + "\n\n" + "\n".join(emb_lines) if body else "\n".join(emb_lines)

    return {
        "text": body.strip() if body else "",
        "images": images,
        "embedded": embedded,
        "metadata": {"email_headers": headers},
    }


def _extract_msg(file_path):
    ensure_packages({"extract-msg": "extract_msg"})
    import extract_msg

    msg = extract_msg.openMsg(file_path)
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

        images = []
        embedded = []
        img_idx = 0
        emb_idx = 0
        cid_to_idx = {}

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

            if cid and mimetype.startswith("image/"):
                ext = _guess_ext(mimetype, filename)
                img_idx += 1
                images.append({
                    "data": data,
                    "ext": ext,
                    "context": f"inline (cid:{cid.strip('<> ')})",
                })
                cid_to_idx[cid.strip("<> ")] = img_idx
            else:
                emb_idx += 1
                embedded.append({"filename": filename, "data": data})

        # Replace cid references and data URI images in HTML with [IMG:N] markers
        if body_html:
            for cid, idx in cid_to_idx.items():
                body_html = re.sub(
                    rf'<img[^>]+src=["\']cid:{re.escape(cid)}["\'][^>]*>',
                    f'[IMG:{idx}]',
                    body_html,
                    flags=re.IGNORECASE,
                )

            def _replace_data_uri(m):
                nonlocal img_idx
                img_type = m.group(1)
                b64data = m.group(2)
                try:
                    decoded = base64.b64decode(b64data)
                    img_idx += 1
                    images.append({
                        "data": decoded,
                        "ext": img_type,
                        "context": "data URI in HTML body",
                    })
                    return f'[IMG:{img_idx}]'
                except Exception:
                    return ''

            body_html = _RE_DATA_URI.sub(_replace_data_uri, body_html)

        # Build final body text
        if body_plain:
            body = body_plain.strip()
            if images:
                img_lines = [f"[IMG:{i}]" for i in range(1, img_idx + 1)]
                body = body + "\n\n" + "\n".join(img_lines)
        elif body_html:
            body = strip_html(body_html)
        else:
            body = ""

        # Append [EMB:N] for attachments
        if embedded:
            emb_lines = [f"[EMB:{i}]" for i in range(1, emb_idx + 1)]
            body = body.strip() + "\n\n" + "\n".join(emb_lines) if body else "\n".join(emb_lines)

        return {
            "text": body.strip() if body else "",
            "images": images,
            "embedded": embedded,
            "metadata": {"email_headers": headers},
        }
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


def _guess_ext(content_type, filename=None):
    if filename:
        ext = Path(filename).suffix.lstrip(".")
        if ext:
            return ext
    mapping = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/bmp": "bmp",
        "image/webp": "webp",
        "image/svg+xml": "svg",
    }
    return mapping.get(content_type, "bin")

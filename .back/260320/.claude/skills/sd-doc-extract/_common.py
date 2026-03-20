"""Shared utilities for document extraction scripts."""

import sys
import io
import os
import re
import html
import subprocess
from pathlib import Path


def setup_encoding():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")


def ensure_packages(packages: dict[str, str]):
    for pip_name, import_name in packages.items():
        try:
            __import__(import_name)
        except ImportError:
            print(f"Installing package: {pip_name}...", file=sys.stderr)
            subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def save_image(out_dir: Path, img_idx: int, blob: bytes, ext: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    img_path = out_dir / f"img_{img_idx:03d}.{ext}"
    img_path.write_bytes(blob)
    return img_path


def save_embedded(out_dir: Path, idx: int, filename: str, data: bytes,
                  prefix: str = "embedded") -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    safe_name = re.sub(r'[<>:"/\\|?*]', '_', filename)
    save_path = out_dir / f"{prefix}_{idx:03d}_{safe_name}"
    save_path.write_bytes(data)
    return save_path


_CONTENT_TYPE_MAP = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
    "image/svg+xml": "svg",
    "image/webp": "webp",
    "image/x-emf": "emf",
    "image/x-wmf": "wmf",
}


def ext_from_content_type(content_type: str) -> str:
    if content_type in _CONTENT_TYPE_MAP:
        return _CONTENT_TYPE_MAP[content_type]
    ext = content_type.split("/")[-1]
    if "+" in ext:
        ext = ext.split("+")[0]
    return ext


def normalize_cell(text) -> str:
    if text is None:
        return ""
    return str(text).strip().replace("\n", " ")


def parse_heading_level(style_name: str) -> int | None:
    m = re.match(r"Heading\s*(\d+)", style_name)
    if m:
        return int(m.group(1))
    return None


def fmt_size(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 * 1024:
        return f"{n / 1024:.1f} KB"
    return f"{n / (1024 * 1024):.1f} MB"


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


# ── HTML stripping ──────────────────────────────────────────────────

_RE_STYLE = re.compile(r"<style[^>]*>.*?</style>", re.DOTALL | re.I)
_RE_SCRIPT = re.compile(r"<script[^>]*>.*?</script>", re.DOTALL | re.I)
_RE_BR = re.compile(r"<br\s*/?>", re.I)
_RE_BLOCK_CLOSE = re.compile(r"</(?:p|div|tr|li)>", re.I)
_RE_TAG = re.compile(r"<[^>]+>")
_RE_MULTI_NEWLINE = re.compile(r"\n{3,}")


def strip_html(text: str) -> str:
    text = _RE_STYLE.sub("", text)
    text = _RE_SCRIPT.sub("", text)
    text = _RE_BR.sub("\n", text)
    text = _RE_BLOCK_CLOSE.sub("\n", text)
    text = _RE_TAG.sub("", text)
    text = html.unescape(text)
    text = _RE_MULTI_NEWLINE.sub("\n\n", text)
    return text.strip()

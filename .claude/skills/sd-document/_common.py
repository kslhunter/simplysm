"""Shared utilities for document extraction scripts."""

import sys
import io
import re
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


def make_output_paths(file_path: str) -> tuple[Path, Path]:
    p = Path(file_path)
    out_dir = p.parent / f"{p.stem}_files"
    return p, out_dir


def print_header(file_path: Path):
    print(f"# {file_path.name}\n")


def save_image(out_dir: Path, img_idx: int, blob: bytes, ext: str) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    img_path = out_dir / f"img_{img_idx:03d}.{ext}"
    img_path.write_bytes(blob)
    return img_path


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


def print_image_summary(img_idx: int, out_dir: Path):
    if img_idx > 0:
        print(f"---\n{img_idx} image(s) saved: {out_dir}")
    else:
        print("---\nNo images")


def run_cli(extract_fn, usage_name: str, packages: dict[str, str]):
    if len(sys.argv) < 2:
        print(f"Usage: python {usage_name} <file>", file=sys.stderr)
        sys.exit(1)
    ensure_packages(packages)
    extract_fn(sys.argv[1])


def normalize_cell(text) -> str:
    if text is None:
        return ""
    return str(text).strip().replace("\n", " ")


def parse_heading_level(style_name: str) -> int | None:
    m = re.match(r"Heading\s*(\d+)", style_name)
    if m:
        return int(m.group(1))
    return None

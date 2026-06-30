"""sd-unpack 공용 유틸 (슬러그·락·README 빌더·long path 헬퍼 등)."""
from __future__ import annotations

import contextlib
import os
import re
import shutil
import sys
import tempfile
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Optional


def ensure_pip(import_name: str, pip_name: Optional[str] = None) -> None:
    """import 가능한지 확인하고 없으면 pip install. 호출자는 이후 정상 import 사용."""
    import importlib
    try:
        importlib.import_module(import_name)
    except ImportError:
        import subprocess
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", pip_name or import_name]
        )


def decode_bytes(payload: bytes) -> str:
    """바이트 → 문자열. charset-normalizer 로 인코딩 자동 감지. 실패 시 throw."""
    ensure_pip("charset_normalizer", "charset-normalizer")
    from charset_normalizer import from_bytes
    result = from_bytes(payload).best()
    if result is None:
        raise RuntimeError(f"encoding detection failed (payload size={len(payload)})")
    return str(result)


CONTAINER_EXTS = {".eml", ".msg", ".pdf", ".docx", ".pptx", ".xlsx", ".xlsb", ".doc", ".ppt", ".xls"}

OS_FORBIDDEN_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def long_str(path: Path) -> str:
    r"""Windows MAX_PATH(260) 우회 위해 절대경로에 \\?\ prefix 적용한 string 반환.

    재귀 첨부로 path 가 깊어져 260 byte 를 넘어도 OS API 가 받아주도록.
    Posix 시스템에서는 그대로 str(path).
    """
    s = str(path)
    if os.name != "nt":
        return s
    if s.startswith("\\\\?\\") or s.startswith("\\\\.\\"):
        return s
    if not path.is_absolute():
        s = str(path.resolve())
        if s.startswith("\\\\?\\"):
            return s
    return "\\\\?\\" + s


def short_str(path: Path) -> str:
    r"""\\?\ prefix 없는 일반 string. Office COM 은 \\?\ 를 거부하므로 COM Open 호출에는 이걸 사용."""
    s = str(path)
    if s.startswith("\\\\?\\"):
        return s[4:]
    return s


def write_text(path: Path, text: str, encoding: str = "utf-8") -> None:
    with open(long_str(path), "w", encoding=encoding) as f:
        f.write(text)


def write_bytes(path: Path, data: bytes) -> None:
    with open(long_str(path), "wb") as f:
        f.write(data)


def mkdir(path: Path) -> None:
    os.makedirs(long_str(path), exist_ok=True)


def copy(src: Path, dst: Path) -> None:
    shutil.copy2(long_str(src), long_str(dst))


def _ensure_tmp_base() -> Path:
    base = Path(tempfile.gettempdir()) / "tmp" / "unpack"
    base.mkdir(parents=True, exist_ok=True)
    return base


def slugify_filename(raw_name: str, max_len: int = 80) -> str:
    """OS 금지 문자만 _ 로 치환. 한국어/공백 그대로."""
    cleaned = OS_FORBIDDEN_CHARS.sub("_", raw_name)
    cleaned = cleaned.strip().rstrip(".")
    if len(cleaned) > max_len:
        cleaned = cleaned[:max_len]
    if not cleaned:
        cleaned = "untitled"
    return cleaned


def output_dir_for(input_path: Path) -> Path:
    """path/to/<basename>.<ext> → path/to/<basename>_<ext>/"""
    basename = input_path.stem
    ext = input_path.suffix.lstrip(".")
    parent = input_path.parent
    return parent / f"{slugify_filename(basename)}_{ext}"


def is_container(path: Path) -> bool:
    return path.suffix.lower() in CONTAINER_EXTS


def unique_path(parent: Path, file_name: str) -> Path:
    """parent/file_name 이 이미 존재하면 _1, _2 ... 붙여 충돌 회피."""
    safe = slugify_filename(file_name)
    dst = parent / safe
    if not dst.exists():
        return dst
    stem = Path(safe).stem
    suffix = Path(safe).suffix
    i = 1
    while True:
        cand = parent / f"{stem}_{i}{suffix}"
        if not cand.exists():
            return cand
        i += 1


# in-process mutex. 단일 thread 라 사실상 noop 이지만 future-proof.
# 이전엔 OS file lock (msvcrt.locking) 사용했지만 sequential 호출에도 release/acquire race
# 로 60s polling 발생 → 단일 process 안에서는 in-process lock 으로 충분 + 즉시 grant.
_com_lock_inproc = threading.Lock()


@contextlib.contextmanager
def com_lock(timeout: int = 600):
    """COM 동시 충돌 방지 (in-process mutex). 단일 process 안에서 sequential 호출 보장."""
    if not _com_lock_inproc.acquire(timeout=timeout):
        raise TimeoutError("COM lock acquisition timed out")
    try:
        yield
    finally:
        _com_lock_inproc.release()


@contextlib.contextmanager
def temp_workdir():
    base = _ensure_tmp_base()
    d = Path(tempfile.mkdtemp(prefix="sd-unpack-", dir=str(base)))
    try:
        yield d
    finally:
        shutil.rmtree(d, ignore_errors=True)


def is_tnef(path: Path) -> bool:
    """TNEF (winmail.dat) 형식인지 검사. filename 또는 magic bytes."""
    if path.name.lower() in ("winmail.dat", "win.dat"):
        return True
    with open(long_str(path), "rb") as f:
        magic = f.read(4)
    return magic == b"\x78\x9f\x3e\x22"


def unpack_tnef(path: Path, attachments_dir: Path) -> list[Path]:
    """TNEF (winmail.dat) 내부 첨부 추출. 추출된 path list 반환.

    TNEF 아니면 빈 list. 파싱·추출 실패 시 raise (내부 첨부 손실을 묻지 않고 메일 풀이 중단).
    원본 winmail.dat 은 유지 (원본 보존).
    """
    if not is_tnef(path):
        return []
    ensure_pip("tnefparse")
    from tnefparse import TNEF
    with open(long_str(path), "rb") as f:
        t = TNEF(f.read())

    saved: list[Path] = []
    for att in getattr(t, "attachments", []):
        att_name = None
        lf = getattr(att, "long_filename", None)
        if callable(lf):
            try:
                att_name = lf()
            except Exception:
                att_name = None
        if not att_name:
            att_name = getattr(att, "name", None)
        if isinstance(att_name, bytes):
            try:
                att_name = att_name.decode("utf-8")
            except UnicodeDecodeError:
                att_name = att_name.decode("cp949", errors="replace")
        if not att_name:
            att_name = "tnef_attachment.bin"
        data = att.data
        if data is None:
            raise RuntimeError(
                f"TNEF 첨부 '{att_name}' 추출 실패 (data 없음) — {path.name}"
            )
        if not isinstance(att_name, str):
            att_name = "tnef_attachment.bin"
        dst = unique_path(attachments_dir, att_name)
        write_bytes(dst, data)
        saved.append(dst)
    return saved


def save_source(input_path: Path, out_dir: Path) -> None:
    ext = input_path.suffix.lstrip(".")
    dst = out_dir / f"_source.{ext}"
    copy(input_path, dst)


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def format_size(num_bytes: int) -> str:
    """파일 크기 human-readable. 분석 진입 비용 예측용."""
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    if num_bytes < 1024 * 1024 * 1024:
        return f"{num_bytes / (1024 * 1024):.1f} MB"
    return f"{num_bytes / (1024 * 1024 * 1024):.1f} GB"


def write_readme(
    out_dir: Path,
    *,
    source_name: str,
    source_size: int,
    tool: str,
    loss_notes: str,
    body_inline: Optional[str] = None,
    body_file_link: Optional[str] = None,
    body_html_link: Optional[str] = None,
    body_from_html_link: Optional[str] = None,
    headers: Optional[dict] = None,
    sections: Optional[dict] = None,
    attachments: Optional[list] = None,
    warnings: Optional[list] = None,
) -> None:
    """README.md 생성. 모든 컨테이너 핸들러가 마지막에 호출."""
    ext = Path(source_name).suffix.lstrip(".")
    lines: list[str] = []
    lines.append(f"# {source_name} 풀이 결과")
    lines.append("")
    lines.append(f"- 원본: `_source.{ext}` ({source_size} bytes)")
    lines.append(f"- 처리 도구: {tool}")
    lines.append(f"- 처리 시각: {now_iso()}")
    lines.append(f"- 손실 가능 영역: {loss_notes}")
    lines.append("")

    if warnings:
        lines.append("## 경고")
        for w in warnings:
            lines.append(f"- {w}")
        lines.append("")

    if body_inline or body_file_link or body_html_link or body_from_html_link:
        lines.append("## 본문")
        lines.append("")
        if body_inline:
            lines.append(body_inline)
            lines.append("")
        elif body_file_link:
            lines.append(f"→ [{body_file_link}]({body_file_link})")
            lines.append("")
        if body_from_html_link:
            lines.append(f"→ [{body_from_html_link}]({body_from_html_link}) (HTML→평문, 인라인 이미지 위치 placeholder 포함)")
            lines.append("")
        if body_html_link:
            lines.append(f"→ [{body_html_link}]({body_html_link}) (원본 HTML)")
            lines.append("")

    if headers:
        non_empty = {k: v for k, v in headers.items() if v}
        if non_empty:
            lines.append("## 헤더")
            for k, v in non_empty.items():
                lines.append(f"- {k}: {v}")
            lines.append("")

    if sections:
        for title, items in sections.items():
            if not items:
                continue
            lines.append(f"## {title}")
            for item in items:
                lines.append(f"- {item}")
            lines.append("")

    if attachments:
        lines.append(f"## 첨부 ({len(attachments)}개)")
        for a in attachments:
            lines.append(f"- `{a}`")
        lines.append("")

    write_text(out_dir / "README.md", "\n".join(lines))

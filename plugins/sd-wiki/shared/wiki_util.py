"""CLI, hook 이 공유하는 leaf 유틸 — 다른 모듈을 import 하지 않는 단방향 싱크."""

from __future__ import annotations

import json
import os
import sys
from typing import Any


def default_data_dir() -> str:
    """토큰 고정경로.

    에이전트의 일반 셸엔 플러그인 환경변수가 주입되지 않으므로,
    hook 과 CLI 가 같은 토큰을 보려면 환경변수에 기대지 않는 고정경로여야 한다.
    """
    home = os.environ.get("HOME") or os.environ.get("USERPROFILE") or os.path.expanduser("~")
    return os.path.join(home, ".claude", "sd")


def is_record(value: Any) -> bool:
    return isinstance(value, dict)


def read_stdin_json_record() -> dict | None:
    if sys.stdin is None or sys.stdin.isatty():
        return None
    return parse_stdin_json_record(sys.stdin.read())


def parse_stdin_json_record(text: str) -> dict | None:
    stripped = text.strip()
    if not stripped:
        return None
    try:
        parsed = json.loads(stripped)
    except ValueError:
        return None
    return parsed if isinstance(parsed, dict) else None


def get_error_message(error: Any) -> str:
    message = str(error)
    return message if message else type(error).__name__


def decode_utf8_strict(data: bytes) -> str:
    """UTF-8 로만 해석한다. 깨진 바이트는 대체문자로 뭉개지 않고 그대로 드러낸다."""
    return data.decode("utf-8")


def configure_stdio() -> None:
    """Windows 기본 콘솔 인코딩(cp949)에서 한국어가 깨지지 않도록 UTF-8 로 고정한다."""
    for stream in (sys.stdout, sys.stderr):
        if stream is not None:
            stream.reconfigure(encoding="utf-8")

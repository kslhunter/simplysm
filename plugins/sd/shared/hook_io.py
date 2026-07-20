"""훅 진입점이 공유하는 입출력 유틸.

Claude Code 훅은 stdin 으로 JSON 페이로드를 받고 stdout 으로 컨텍스트를 주입한다.
stdout 은 곧 주입 내용이므로 이 모듈은 stdout 에 아무것도 쓰지 않는다.
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
from typing import Any


def read_stdin_json() -> Any | None:
    """stdin 페이로드를 읽어 파싱한다. 터미널 직접 실행이거나 비어 있으면 None."""
    if sys.stdin is None or sys.stdin.isatty():
        return None
    return parse_stdin_json(sys.stdin.read())


def parse_stdin_json(text: str) -> Any | None:
    stripped = text.strip()
    return json.loads(stripped) if stripped else None


def as_record(value: Any) -> dict[str, Any] | None:
    return value if isinstance(value, dict) else None


def get_session_id(data: Any) -> str:
    record = as_record(data)
    session_id = record.get("session_id") if record else None
    return session_id if isinstance(session_id, str) and session_id else "unknown"


def get_cwd(data: Any) -> str:
    record = as_record(data)
    cwd = record.get("cwd") if record else None
    return cwd if isinstance(cwd, str) and cwd else os.getcwd()


def format_error_message(error: Any) -> str:
    return str(error)


def get_tool_input(data: Any, field: str) -> str | None:
    """훅 페이로드의 tool_input.<field> 를 문자열로 꺼낸다. 없으면 None."""
    record = as_record(data)
    tool_input = as_record(record.get("tool_input")) if record else None
    value = tool_input.get(field) if tool_input else None
    return value if isinstance(value, str) and value else None


def resolve_plugin_root(data: Any, hook_file: str) -> str:
    """플러그인 루트. 환경변수 → 페이로드 → 훅 파일 위치 순."""
    env_plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
    if env_plugin_root:
        return env_plugin_root

    record = as_record(data)
    if record:
        for key in ("plugin_root", "pluginRoot"):
            value = record.get(key)
            if isinstance(value, str) and value:
                return value

    return os.path.dirname(os.path.dirname(os.path.abspath(hook_file)))


def resolve_project_dir(data: Any) -> str:
    """작업 프로젝트 디렉터리. 환경변수 → 페이로드 → 현재 디렉터리 순."""
    env_project_dir = os.environ.get("CLAUDE_PROJECT_DIR")
    if env_project_dir:
        return env_project_dir
    return get_cwd(data)


def read_hash_dir(session_id: str) -> str:
    """Read 시점 파일 해시 캐시 디렉터리. 세션 단위로 갈라 둔다."""
    return os.path.join(tempfile.gettempdir(), "tmp", "read_hash", session_id)


def configure_stdio() -> None:
    """Windows 기본 콘솔 인코딩(cp949)에서 한국어 주입 텍스트가 깨지지 않도록 UTF-8 로 고정한다."""
    for stream in (sys.stdout, sys.stderr):
        if stream is not None:
            stream.reconfigure(encoding="utf-8")

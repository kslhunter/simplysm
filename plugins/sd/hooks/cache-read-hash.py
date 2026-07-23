"""PostToolUse(Read) hook — 파일 전체를 읽었을 때만 해시를 세션 캐시에 기록한다.

check-write 가 이 기록과 대조해 "전체 내용을 모르는 파일" 덮어쓰기를 막는다.
부분 Read(offset/limit, 2000줄 초과 절단)는 전체앎이 아니므로 기록하지 않는다.
"""

from __future__ import annotations

import os
from typing import Any

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    as_record,
    configure_stdio,
    get_session_id,
    get_tool_input,
    read_hash_dir,
    read_stdin_json,
)
from shared.write_hash import file_hash, is_regular_file, path_hash

READ_DEFAULT_LIMIT = 2000


def main() -> None:
    data = read_stdin_json()
    file_path = get_tool_input(data, "file_path")
    if not file_path or not is_regular_file(file_path):
        return
    if not is_full_read(data, file_path):
        return

    cache_dir = read_hash_dir(get_session_id(data))
    os.makedirs(cache_dir, exist_ok=True)
    with open(
        os.path.join(cache_dir, path_hash(file_path)), "w", encoding="utf-8"
    ) as handle:
        handle.write(file_hash(file_path))


def is_full_read(data: Any, file_path: str) -> bool:
    offset = get_numeric_input(data, "offset")
    if offset is not None and offset > 1:
        return False
    limit = get_numeric_input(data, "limit")
    effective_limit = limit if limit is not None else READ_DEFAULT_LIMIT
    return count_lines(file_path) <= effective_limit


def get_numeric_input(data: Any, field: str) -> int | None:
    record = as_record(data)
    tool_input = as_record(record.get("tool_input")) if record else None
    value = tool_input.get(field) if tool_input else None
    if isinstance(value, bool):
        return None
    return int(value) if isinstance(value, (int, float)) else None


def count_lines(file_path: str) -> int:
    with open(file_path, "rb") as handle:
        content = handle.read()
    if not content:
        return 0
    return content.count(b"\n") + (0 if content.endswith(b"\n") else 1)


configure_stdio()
main()

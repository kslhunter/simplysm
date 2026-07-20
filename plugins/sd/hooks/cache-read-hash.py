"""PostToolUse(Read) hook — 방금 읽은 파일의 해시를 세션 캐시에 기록한다.

check-write 가 이 기록과 대조해 "Read 이후 바뀐 파일" 덮어쓰기를 막는다.
"""

from __future__ import annotations

import os

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    configure_stdio,
    get_session_id,
    get_tool_input,
    read_hash_dir,
    read_stdin_json,
)
from shared.write_hash import file_hash, is_regular_file, path_hash


def main() -> None:
    data = read_stdin_json()
    file_path = get_tool_input(data, "file_path")
    if not file_path or not is_regular_file(file_path):
        return

    cache_dir = read_hash_dir(get_session_id(data))
    os.makedirs(cache_dir, exist_ok=True)
    with open(os.path.join(cache_dir, path_hash(file_path)), "w", encoding="utf-8") as handle:
        handle.write(file_hash(file_path))


configure_stdio()
main()

"""PostToolUse(Write|Edit) hook — 방금 쓴 파일의 전체앎 해시를 기록한다.

기록 조건:
- Write: 항상 (전체를 방금 썼으므로 전체앎).
- Edit: 세션 캐시 항목이 남아 있을 때만. pre-edit-sync 가 어긋난 항목을
  지우므로, 남아 있음 = "Edit 직전까지 전체앎"의 증거다.
"""

from __future__ import annotations

import os

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


def main() -> None:
    data = read_stdin_json()
    file_path = get_tool_input(data, "file_path")
    if not file_path or not is_regular_file(file_path):
        return

    cache_dir = read_hash_dir(get_session_id(data))
    cache_path = os.path.join(cache_dir, path_hash(file_path))

    record = as_record(data)
    tool_name_ = record.get("tool_name") if record else None
    if tool_name_ == "Edit" and not os.path.isfile(cache_path):
        return  # pre-edit-sync 가 무효화함 = 전체앎 아님. 기록하지 않는다.

    os.makedirs(cache_dir, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as handle:
        handle.write(file_hash(file_path))


configure_stdio()
main()

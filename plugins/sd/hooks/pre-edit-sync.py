"""PreToolUse(Edit) hook — 전체앎 기록과 현재 파일이 어긋나면 기록을 무효화한다.

Edit 자체는 차단하지 않는다(치환은 안 본 부분을 날리지 않으므로).
기록이 남아 있으면 "Edit 직전까지 전체앎 유지"의 증거가 되어, post 훅이
Edit 후 새 해시로 갱신한다. 어긋난 기록을 지워 두지 않으면 이후 Write 가
낡은 전체상으로 통과해 다른 수정사항을 덮어쓸 수 있다.
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

    cache_path = os.path.join(read_hash_dir(get_session_id(data)), path_hash(file_path))
    if not os.path.isfile(cache_path):
        return
    with open(cache_path, encoding="utf-8") as handle:
        cached_hash = handle.read().strip()
    if cached_hash != file_hash(file_path):
        os.remove(cache_path)


configure_stdio()
main()

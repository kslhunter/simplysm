"""PreToolUse(Write) hook — 전체 내용을 모르는 파일의 덮어쓰기를 막는다.

전체앎 시점(전체 Read, Write/Edit 성공 후)에 기록해 둔 해시와 현재 파일 해시를
대조한다. 기록이 없으면(부분 Read 만 했거나 외부 수정으로 무효화됨) 역시 막는다.
차단은 종료코드 2 로만 성립한다.
"""

from __future__ import annotations

import os
import sys

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    configure_stdio,
    format_error_message,
    get_session_id,
    get_tool_input,
    read_hash_dir,
    read_stdin_json,
)
from shared.write_hash import file_hash, is_regular_file, path_hash


class WriteHashViolationError(Exception):
    pass


def main() -> None:
    try:
        data = read_stdin_json()
        file_path = get_tool_input(data, "file_path")
        if not file_path or not is_regular_file(file_path):
            return

        cache_path = os.path.join(
            read_hash_dir(get_session_id(data)), path_hash(file_path)
        )
        if read_cached_hash(cache_path) != file_hash(file_path):
            raise WriteHashViolationError(
                "CRITICAL: File content has changed or was never Read. "
                "You MUST Read the file first, then MUST REVISE your Write content "
                f"based on the current file content before retrying: {file_path}"
            )
    except SystemExit:
        raise
    except WriteHashViolationError as error:
        print(format_error_message(error), file=sys.stderr)
        sys.exit(2)
    except Exception as error:
        print(
            f"Blocked: check-write guard failed ({format_error_message(error)}). "
            "Read the file first, then retry.",
            file=sys.stderr,
        )
        sys.exit(2)


def read_cached_hash(cache_path: str) -> str:
    try:
        with open(cache_path, encoding="utf-8") as handle:
            return handle.read().strip()
    except OSError:
        return ""


configure_stdio()
main()

"""PostToolUse(Write|Edit) hook — 파일을 프로젝트 포맷터로 정리한 뒤 전체앎 해시를 기록한다.

포맷터 판별: 파일 위치에서 상위로 올라가며 가장 가까운 package.json 의
dependencies/devDependencies 에 oxfmt → oxfmt, 아니면 prettier → prettier.
둘 다 미선언이면 포맷 없이 해시만 기록한다.

해시 기록 조건:
- Write: 항상 (전체를 방금 썼으므로 전체앎).
- Edit: 세션 캐시 항목이 남아 있을 때만. pre-edit-sync 가 어긋난 항목을
  지우므로, 남아 있음 = "Edit 직전까지 전체앎"의 증거다.

포맷 실패 시 파일과 흐름은 그대로 두고(현재 해시 기록):
- 파일 자체의 parse error(포맷터 비정상 종료)는 중간 수정 단계에서 당연하므로
  1줄 경고 + exit 1 (모델 컨텍스트 미주입).
- 미설치, 실행 실패 등 환경 문제는 exit 2 로 모델에 알린다.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    as_record,
    configure_stdio,
    format_error_message,
    get_session_id,
    get_tool_input,
    read_hash_dir,
    read_stdin_json,
)
from shared.write_hash import file_hash, is_regular_file, path_hash

FORMAT_TIMEOUT_SECONDS = 60


class FormatError(Exception):
    pass


class ParseFormatError(FormatError):
    """포맷터가 파일 내용(문법) 때문에 비정상 종료한 경우. 중간 수정 단계의 정상 상황."""


def main() -> None:
    data = read_stdin_json()
    file_path = get_tool_input(data, "file_path")
    if not file_path or not is_regular_file(file_path):
        return

    format_error: FormatError | None = None
    try:
        format_file(file_path)
    except FormatError as error:
        format_error = error

    record_hash(data, file_path)

    if isinstance(format_error, ParseFormatError):
        print(f"[format skipped: parse error] {file_path}", file=sys.stderr)
        sys.exit(1)
    if format_error is not None:
        print(
            f"Auto-format failed for {file_path}: {format_error_message(format_error)} "
            "(file kept as written)",
            file=sys.stderr,
        )
        sys.exit(2)


def format_file(file_path: str) -> None:
    found = find_formatter(file_path)
    if found is None:
        return
    tool_name_, project_dir = found

    bin_path = find_bin(file_path, tool_name_)
    if bin_path is None:
        raise FormatError(f"{tool_name_} is declared in package.json but not installed")

    if tool_name_ == "oxfmt":
        args = [bin_path, "--no-error-on-unmatched-pattern", file_path]
    else:
        args = [
            bin_path,
            "--write",
            "--ignore-unknown",
            "--log-level",
            "warn",
            file_path,
        ]

    try:
        result = subprocess.run(
            args,
            cwd=project_dir,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=FORMAT_TIMEOUT_SECONDS,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        raise FormatError(
            f"{tool_name_} run failed: {format_error_message(error)}"
        ) from error

    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "").strip()
        raise ParseFormatError(
            f"{tool_name_} exited with {result.returncode}: {detail}"
        )


def find_formatter(file_path: str) -> tuple[str, str] | None:
    """상위로 올라가며 oxfmt/prettier 를 선언한 가장 가까운 package.json 을 찾는다."""
    for dir_path in iter_ancestor_dirs(file_path):
        manifest_path = os.path.join(dir_path, "package.json")
        if not os.path.isfile(manifest_path):
            continue
        try:
            with open(manifest_path, encoding="utf-8") as handle:
                manifest = as_record(json.load(handle)) or {}
        except (OSError, ValueError) as error:
            raise FormatError(
                f"cannot read {manifest_path}: {format_error_message(error)}"
            ) from error
        declared = {
            **(as_record(manifest.get("dependencies")) or {}),
            **(as_record(manifest.get("devDependencies")) or {}),
        }
        if "oxfmt" in declared:
            return ("oxfmt", dir_path)
        if "prettier" in declared:
            return ("prettier", dir_path)
    return None


def find_bin(file_path: str, tool: str) -> str | None:
    suffixes = (".CMD", ".cmd", ".exe", "") if os.name == "nt" else ("",)
    for dir_path in iter_ancestor_dirs(file_path):
        for suffix in suffixes:
            candidate = os.path.join(
                dir_path, "node_modules", ".bin", f"{tool}{suffix}"
            )
            if os.path.isfile(candidate):
                return candidate
    return None


def iter_ancestor_dirs(file_path: str):
    current = os.path.dirname(os.path.abspath(file_path))
    while True:
        yield current
        parent = os.path.dirname(current)
        if parent == current:
            return
        current = parent


def record_hash(data: object, file_path: str) -> None:
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

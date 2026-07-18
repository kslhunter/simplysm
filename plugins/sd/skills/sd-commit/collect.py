#!/usr/bin/env python3
"""staged 변경분 컨텍스트를 수집해 OS tmp 파일로 저장하고, 그 경로만 출력한다.

사용법: python collect.py
실행한 현재 디렉터리의 저장소를 대상으로 한다.
"""

import subprocess
import sys
import tempfile
from datetime import datetime
from pathlib import Path

# diff 본문에서 제외할 경로. 제외해도 --stat 요약에는 파일명이 남는다.
EXCLUDE_PATHSPECS = [
    ":(exclude).back",
    ":(exclude).back/**",
    ":(exclude)_back",
    ":(exclude)_back/**",
    ":(exclude)**/yarn.lock",
    ":(exclude)**/pnpm-lock.yaml",
    ":(exclude)**/package-lock.json",
    ":(exclude)**/bun.lock",
    ":(exclude)**/bun.lockb",
]


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"git {' '.join(args)} 실행 실패 (exit {result.returncode})\n{result.stderr.strip()}"
        )
    return result.stdout


def main() -> None:
    history = git("log", "-n", "3").strip()
    stat = git("diff", "--staged", "--stat").strip()
    diff = git(
        "diff",
        "--staged",
        "--no-textconv",
        "--find-renames",
        "--find-copies",
        "--diff-algorithm=histogram",
        "--diff-filter=d",
        "--",
        ".",
        *EXCLUDE_PATHSPECS,
    ).strip()
    deleted = git("diff", "--staged", "--name-only", "--diff-filter=D").strip()

    if not stat:
        raise RuntimeError("staged 변경사항이 없습니다.")

    content = "\n".join(
        [
            "<history>",
            history,
            "</history>",
            "",
            "<stat>",
            stat,
            "</stat>",
            "",
            "<diff>",
            diff if diff else "없음",
            "</diff>",
            "",
            "<deleted_files>",
            deleted if deleted else "없음",
            "</deleted_files>",
            "",
        ]
    )

    out_path = (
        Path(tempfile.gettempdir())
        / f"sd-commit-{datetime.now().strftime('%y%m%d%H%M%S%f')}.txt"
    )
    out_path.write_text(content, encoding="utf-8")
    print(out_path)


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)

"""sd-commit 스킬: 작성된 커밋 메시지로 커밋.

커밋 메시지를 stdin 으로 받아 `git commit -F -` 로 커밋한다.
stdin 으로 받는 이유: 멀티라인·특수문자(백틱·따옴표)가 셸 인자로 가면 깨지므로
(중간 파일 없이 안전하게 전달).

staging 은 이 스크립트가 전담한다 — 매 호출 시 `git reset` 으로 인덱스를 초기화한 뒤
커밋 대상 경로만 다시 add 하고 커밋한다. collect.py 의 `git add -A` 는 diff 표시용일 뿐
커밋 대상 확정이 아니므로, 여기서 staging 을 재구성해야 분리 커밋이 정확히 동작한다.

--only <경로...>: 지정 경로만 커밋. 한 워크스페이스가 여러 원격 저장소로 나뉘어
push 되는 구조(예: git subtree)에서 저장소 경계로 커밋을 분리할 때 사용.
생략 시 잔여 전체를 커밋.
"""
from __future__ import annotations

import argparse
import subprocess
import sys

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _git(*args: str) -> None:
    result = subprocess.run(["git", *args])
    if result.returncode != 0:
        raise SystemExit(f"git {' '.join(args)} 실패 (exit {result.returncode})")


def main() -> None:
    parser = argparse.ArgumentParser(description="작성된 메시지(stdin)로 커밋")
    parser.add_argument(
        "--only",
        nargs="+",
        metavar="PATHSPEC",
        help="지정 경로만 커밋 (저장소 경계 분리 커밋용). 생략 시 잔여 전체 커밋.",
    )
    args = parser.parse_args()

    message = sys.stdin.read()
    if message.strip() == "":
        raise SystemExit("커밋 메시지가 비어 있습니다.")

    # staging 전담: 인덱스를 초기화한 뒤 커밋 대상만 다시 담는다.
    _git("reset", "-q")
    if args.only:
        _git("add", "--", *args.only)
    else:
        _git("add", "-A")

    result = subprocess.run(["git", "commit", "-F", "-"], input=message, encoding="utf-8")
    if result.returncode != 0:
        raise SystemExit(f"git commit 실패 (exit {result.returncode})")

    sys.stdout.write("커밋 완료. 메시지가 맘에 들지 않으면 직접 커밋을 취소하세요.\n")


if __name__ == "__main__":
    main()

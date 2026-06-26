"""sd-commit 스킬: 변경사항 staging + 커밋 컨텍스트 수집.

git add -A 로 전체 변경을 staging 한 뒤, 커밋 메시지 작성에 필요한
diff/log/stat 을 모아 임시 파일에 저장하고 그 파일 경로를 stdout 으로 출력한다.
출력된 파일을 Claude 가 읽어 커밋 메시지를 작성한다.

변경사항이 없으면 stderr 에 사유를 남기고 비정상 종료(exit 1)한다.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        capture_output=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode != 0:
        sys.stderr.write(result.stderr)
        raise SystemExit(f"git {' '.join(args)} 실패 (exit {result.returncode})")
    return result.stdout


def main() -> None:
    _git("add", "-A")

    history = _git("log", "-n", "3")
    stat = _git("diff", "--staged", "--stat")
    # AI 입력용 diff — 추적되는 락파일·버전 범프(package.json) 노이즈만 제외 (실제 커밋은 전체 포함)
    diff = _git(
        "diff",
        "--staged",
        "--no-textconv",
        "--find-renames",
        "--find-copies",
        "--diff-algorithm=histogram",
        "--diff-filter=d",
        "--",
        ".",
        ":(exclude)pnpm-lock.yaml",
        ":(exclude)**/package.json",
    )
    # 삭제된 파일 목록만 따로
    deleted = _git("diff", "--staged", "--name-only", "--diff-filter=D")

    if diff.strip() == "":
        raise SystemExit("변경사항이 없습니다.")

    content = (
        f"<history>\n{history.strip()}\n</history>\n\n"
        f"<stat>\n{stat}\n</stat>\n\n"
        f"<diff>\n{diff}\n</diff>\n\n"
        f"<deleted_files>\n{deleted.strip() or '없음'}\n</deleted_files>\n"
    )

    tmp_dir = Path(tempfile.mkdtemp(prefix="sd-commit-"))
    context_file = tmp_dir / "context.txt"
    context_file.write_text(content, encoding="utf-8")

    sys.stdout.write(str(context_file))
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()

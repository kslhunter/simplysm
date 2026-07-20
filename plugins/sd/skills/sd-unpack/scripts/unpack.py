"""sd-unpack 메인 엔트리.

Usage: python unpack.py <file>

입력 파일을 옆 디렉토리 <basename>_<ext>/ 로 풀어 떨군다.
형식별 분기는 handlers/dispatch.py 에서 처리.
"""
from __future__ import annotations

import shutil
import sys
from pathlib import Path

from handlers import _common
from handlers.dispatch import unpack_to


def main() -> None:
    # Windows 콘솔에서 한글 파일명이 깨지지 않도록 stdout/stderr 을 UTF-8 로 강제.
    for stream in (sys.stdout, sys.stderr):
        stream.reconfigure(encoding="utf-8")

    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python unpack.py <file>\n")
        sys.exit(2)

    input_path = Path(sys.argv[1]).resolve()
    if not input_path.is_file():
        sys.stderr.write(f"file not found: {input_path}\n")
        sys.exit(2)

    out_dir = _common.output_dir_for(input_path)
    if out_dir.exists():
        # 이전 풀이 결과만 지운다. 마커(_source.*) 가 없으면 사용자 폴더이므로 중단.
        # README.md 는 마커로 쓰지 않는다 — 도중 실패한 풀이 결과에는 없어서 재실행이 막힌다.
        if not any(out_dir.glob("_source.*")):
            sys.stderr.write(
                f"기존 폴더가 풀이 결과가 아닙니다 (_source.* 없음): {out_dir}\n"
                "직접 확인 후 옮기거나 지운 뒤 다시 실행하세요.\n"
            )
            sys.exit(2)
        # long path 로 만들어진 하위 경로까지 지우려면 \\?\ prefix 필요
        shutil.rmtree(_common.long_str(out_dir))
    _common.mkdir(out_dir)

    # 어떤 예외든 그대로 throw 한다. 호출자(Claude 에이전트 또는 사용자)가
    # stderr 의 traceback 을 보고 원인을 진단, 수정할 수 있도록.
    unpack_to(input_path, out_dir)

    out_str = str(out_dir)
    if out_str.startswith("\\\\?\\"):
        out_str = out_str[4:]
    sys.stdout.write(out_str + "\n")


if __name__ == "__main__":
    main()

"""sd-unpack 메인 엔트리.

Usage: python unpack.py <file>

입력 파일을 옆 디렉토리 <basename>_<ext>/ 로 풀어 떨군다.
형식별 분기는 handlers/dispatch.py 에서 처리.
"""
from __future__ import annotations

import sys
from pathlib import Path

from handlers import _common
from handlers.dispatch import unpack_to


def main() -> None:
    # Windows 콘솔에서 한글 파일명이 깨지지 않도록 stdout/stderr 을 UTF-8 로 강제.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python unpack.py <file>\n")
        sys.exit(2)

    input_path = Path(sys.argv[1]).resolve()
    if not input_path.is_file():
        sys.stderr.write(f"file not found: {input_path}\n")
        sys.exit(2)

    out_dir = _common.output_dir_for(input_path)
    _common.mkdir(out_dir)

    # 어떤 예외든 그대로 throw 한다. 호출자(Claude 에이전트 또는 사용자)가
    # stderr 의 traceback 을 보고 원인을 진단·수정할 수 있도록.
    unpack_to(input_path, out_dir)

    out_str = str(out_dir)
    if out_str.startswith("\\\\?\\"):
        out_str = out_str[4:]
    sys.stdout.write(out_str + "\n")


if __name__ == "__main__":
    main()

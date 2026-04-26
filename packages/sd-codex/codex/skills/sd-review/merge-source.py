#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


def collect_source_files(dir_path: Path) -> list[Path]:
    files: list[Path] = []

    src_dir = dir_path / "src"
    if src_dir.is_dir():
        files.extend(path for path in src_dir.rglob("*.ts") if path.is_file())

    scss_dir = dir_path / "scss"
    if scss_dir.is_dir():
        files.extend(path for path in scss_dir.rglob("*.scss") if path.is_file())

    return sorted(files, key=lambda path: path.as_posix())


def write_merged_source(files: list[Path], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8", newline="\n") as output:
        for file_path in files:
            output.write(f"=== {file_path.as_posix()} ===\n")
            text = file_path.read_text(encoding="utf-8")
            output.write(text)
            if not text.endswith("\n"):
                output.write("\n")
            output.write("\n")


def print_usage() -> None:
    print(
        "Usage: merge-source.py <output-file> --dir <dir-path> | --files <file1> <file2> ...",
        file=sys.stderr,
    )


def main(argv: list[str]) -> int:
    if len(argv) < 3:
        print_usage()
        return 1

    output_path = Path(argv[1])
    mode = argv[2]

    if mode == "--dir":
        if len(argv) != 4:
            print("Error: --dir requires a directory path", file=sys.stderr)
            return 1
        files = collect_source_files(Path(argv[3]))
    elif mode == "--files":
        files = [Path(file_path) for file_path in argv[3:]]
    else:
        print("Error: specify --dir or --files", file=sys.stderr)
        return 1

    write_merged_source(files, output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

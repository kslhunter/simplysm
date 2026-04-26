#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path


def collect_source_files(package_path: Path) -> list[Path]:
    files: list[Path] = []

    src_dir = package_path / "src"
    if src_dir.is_dir():
        files.extend(path for path in src_dir.rglob("*.ts") if path.is_file())

    scss_dir = package_path / "scss"
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


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print("Usage: merge-source.py <package-path> <output-file>", file=sys.stderr)
        return 1

    package_path = Path(argv[1])
    output_path = Path(argv[2])
    write_merged_source(collect_source_files(package_path), output_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))

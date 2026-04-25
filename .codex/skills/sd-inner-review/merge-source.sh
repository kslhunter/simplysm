#!/bin/bash
# 리뷰 대상 소스 파일을 하나의 텍스트 파일로 병합
# Usage:
#   merge-source.sh <출력파일> --dir <디렉토리경로>
#   merge-source.sh <출력파일> --files <파일1> <파일2> ...

output="$1"
shift

if [ -z "$output" ]; then
  echo "Usage: $0 <output-file> --dir <dir-path> | --files <file1> <file2> ..." >&2
  exit 1
fi

mkdir -p "$(dirname "$output")"

mode="$1"
shift

files=""
if [ "$mode" = "--dir" ]; then
  dir_path="$1"
  if [ -z "$dir_path" ]; then
    echo "Error: --dir requires a directory path" >&2
    exit 1
  fi
  files=$(find "$dir_path/src" -name "*.ts" 2>/dev/null | sort)
  [ -d "$dir_path/scss" ] && files+=$'\n'$(find "$dir_path/scss" -name "*.scss" 2>/dev/null | sort)
elif [ "$mode" = "--files" ]; then
  files=$(printf '%s\n' "$@")
else
  echo "Error: specify --dir or --files" >&2
  exit 1
fi

echo "$files" | while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "=== $f ==="
  cat "$f"
  echo
done > "$output"

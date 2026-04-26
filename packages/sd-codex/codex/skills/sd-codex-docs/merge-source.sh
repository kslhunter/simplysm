#!/bin/bash
# 패키지 소스 파일을 하나의 텍스트 파일로 병합
# Usage: merge-source.sh <패키지경로> <출력파일경로>

pkg_path="$1"
output="$2"

if [ -z "$pkg_path" ] || [ -z "$output" ]; then
  echo "Usage: $0 <package-path> <output-file>" >&2
  exit 1
fi

mkdir -p "$(dirname "$output")"

files=$(find "$pkg_path/src" -name "*.ts" 2>/dev/null | sort)
[ -d "$pkg_path/scss" ] && files+=$'\n'$(find "$pkg_path/scss" -name "*.scss" 2>/dev/null | sort)

echo "$files" | while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "=== $f ==="
  cat "$f"
  echo
done > "$output"

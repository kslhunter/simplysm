"""sd 플러그인 hook 공통 유틸.

hooks/ 는 패키지가 아니라 flat 스크립트 모음이므로, 각 hook 실행 시 그 스크립트의
디렉토리(hooks/)가 sys.path[0] 에 자동 등록됨 → `from _common import ...` 로 로드됨.
"""
import hashlib, json, os, sys, tempfile
from pathlib import Path


def load_stdin():
    return json.load(sys.stdin)


def deny(reason):
    """PreToolUse 차단. stderr + exit 2."""
    print(f"Blocked: {reason}", file=sys.stderr)
    sys.exit(2)


def project_root(data):
    return Path(
        os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    ).resolve()


def read_hash_dir(session_id):
    """read-hash 캐시 디렉토리: <tmpdir>/tmp/read_hash/<session_id>."""
    base = Path(tempfile.gettempdir()) / "tmp"
    return base / "read_hash" / session_id


def path_hash(file_path):
    return hashlib.sha256(os.path.normpath(file_path).encode()).hexdigest()


def file_hash(file_path):
    with open(file_path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()

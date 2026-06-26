"""비차단 백그라운드 로그인 + 세션 skip-lock (플러그인 sd-wiki hook).

미인증·만료 시 `session-start.py` 가 위임하는, 비차단 백그라운드 브라우저 로그인의
부수효과를 한 곳에 격리 — 프로세스 자기재실행(worker)·login-lock·로그·세션 skip-lock.
"로그인이 왜 안 떴나"는 이 파일 하나에서 추적된다.

lock/로그/세션 파일은 hook 전용 휘발 상태라 `CLAUDE_PLUGIN_DATA`(없으면 토큰 dir 로
폴백)에 둠 — 공유 토큰(고정경로 ~/.claude/sd)과 책임-위치를 분리한다.

trigger/skip-lock 헬퍼는 코어 의존 0(파일 lock 만 다룸). 코어(`wiki_core`)는 별도
프로세스인 worker 만 사용 — `__main__ --worker` 가 env 의 CLAUDE_PLUGIN_ROOT 로
scripts/ 를 찾아 지연 import 한다.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

try:
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass


def _data_dir() -> Path:
    base = os.environ.get("CLAUDE_PLUGIN_DATA")
    d = Path(base) if base else Path.home() / ".claude" / "sd"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _session_skip_path(session_id: str) -> Path:
    safe_session_id = re.sub(r"[^A-Za-z0-9_.-]", "_", session_id)
    return _data_dir() / f"wiki-session-no-context-{safe_session_id}.lock"


def mark_session_skipped(session_id: str) -> None:
    """이 세션은 위키 없이 진행됨을 표시 — 같은 session_id 의 이후 주입을 생략."""
    try:
        _session_skip_path(session_id).write_text(str(time.time()), encoding="utf-8")
    except OSError:
        pass


def is_session_skipped(session_id: str) -> bool:
    return _session_skip_path(session_id).exists()


def trigger_background_login() -> None:
    """login-lock 을 단발 획득한 뒤 detached worker 프로세스로 브라우저 로그인을 시작.

    lock 이 이미 있으면(다른 세션·프로세스가 진행 중이거나 끝난 직후) 아무것도 안 함.
    """
    data_dir = _data_dir()
    lock_path = data_dir / "wiki-login.lock"
    log_path = data_dir / "wiki-login.log"

    try:
        fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except (FileExistsError, OSError):
        return

    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"startedAt": time.time()}, f)

    log_file = None
    try:
        log_file = open(log_path, "a", encoding="utf-8")
        subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), "--worker", str(lock_path)],
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=log_file,
            env=os.environ.copy(),
        )
    except Exception:
        try:
            lock_path.unlink()
        except OSError:
            pass
    finally:
        if log_file is not None:
            log_file.close()


def _run_worker(lock_path_str: str) -> None:
    try:
        plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
        if not plugin_root:
            raise RuntimeError("CLAUDE_PLUGIN_ROOT 환경변수가 없습니다.")
        scripts_dir = str(Path(plugin_root) / "scripts")
        if scripts_dir not in sys.path:
            sys.path.insert(0, scripts_dir)
        import wiki_core

        wiki_core.browser_login()
    except Exception as err:
        print(f"[위키 인증] 백그라운드 로그인 실패: {err}", file=sys.stderr)
    finally:
        try:
            Path(lock_path_str).unlink()
        except OSError:
            pass


def _main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker")
    args, _ = parser.parse_known_args(argv)
    if args.worker:
        _run_worker(args.worker)
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))

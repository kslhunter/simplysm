"""비차단 백그라운드 로그인 + 세션 skip 표시.

미인증, 만료 시 세션을 막지 않고 백그라운드에서만 브라우저 로그인을 띄운다.
락으로 동시 실행을 하나로 묶고, 워커가 비정상 종료해 남은 오래된 락은 걷어낸다.
"""

from __future__ import annotations

import contextlib
import json
import os
import re
import subprocess
import sys
import time

from shared.wiki_util import default_data_dir

#: 로그인 대기 한도(300초)보다 충분히 큰 값 — 이보다 오래된 lock 은 워커 비정상 종료 잔존으로 본다.
LOGIN_LOCK_TTL_SEC = 600

DATA_DIR_ENV_NAME = "CLAUDE_PLUGIN_DATA"
PLUGIN_ROOT_ENV_NAME = "CLAUDE_PLUGIN_ROOT"
WORKER_ARG = "--worker"


def wiki_data_dir() -> str:
    dir_path = os.environ.get(DATA_DIR_ENV_NAME) or default_data_dir()
    os.makedirs(dir_path, exist_ok=True)
    return dir_path


def session_skip_path(session_id: str) -> str:
    safe_session_id = re.sub(r"[^A-Za-z0-9_.-]", "_", session_id)
    return os.path.join(
        wiki_data_dir(), f"wiki-session-no-context-{safe_session_id}.lock"
    )


def mark_session_skipped(session_id: str) -> None:
    """이 세션은 위키 없이 진행됨을 표시 — 같은 세션의 이후 주입을 생략."""
    try:
        with open(session_skip_path(session_id), "w", encoding="utf-8") as handle:
            handle.write(str(time.time()))
    except OSError:
        # 세션 skip 기록 실패는 hook 흐름을 막지 않는다.
        pass


def is_session_skipped(session_id: str) -> bool:
    return os.path.exists(session_skip_path(session_id))


def login_lock_age_sec(lock_path: str) -> float | None:
    started_at: float | None = None
    try:
        with open(lock_path, encoding="utf-8") as handle:
            parsed = json.load(handle)
        if isinstance(parsed, dict) and isinstance(
            parsed.get("startedAt"), (int, float)
        ):
            started_at = float(parsed["startedAt"])
    except OSError, ValueError:
        # lock 본문 손상, 미기록 — 파일 시각으로 폴백한다.
        pass

    if started_at is None:
        try:
            started_at = os.stat(lock_path).st_mtime
        except OSError:
            return None  # lock 이 그 사이 사라짐 등 — 판단 불가.

    return time.time() - started_at


def acquire_login_lock(lock_path: str) -> int | None:
    flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
    try:
        return os.open(lock_path, flags)
    except FileExistsError:
        pass
    except OSError:
        return None

    # 이미 lock 이 있음 — 워커 비정상 종료로 남은 stale 이면 치우고 1회만 재획득한다.
    age_sec = login_lock_age_sec(lock_path)
    if age_sec is None or age_sec <= LOGIN_LOCK_TTL_SEC:
        return None

    try:
        os.remove(lock_path)
        return os.open(lock_path, flags)
    except OSError:
        return None


def write_lock_payload(descriptor: int) -> None:
    try:
        os.write(descriptor, json.dumps({"startedAt": time.time()}).encode("utf-8"))
    finally:
        with contextlib.suppress(OSError):
            os.close(descriptor)


def trigger_background_login() -> None:
    """login-lock 을 단발 획득한 뒤 detached worker 로 브라우저 로그인을 시작.

    lock 이 이미 있으면(다른 세션, 프로세스가 진행 중이거나 끝난 직후) 아무것도 안 함.
    """
    plugin_root = os.environ.get(PLUGIN_ROOT_ENV_NAME)
    if not plugin_root:
        return

    dir_path = wiki_data_dir()
    lock_path = os.path.join(dir_path, "wiki-login.lock")
    log_path = os.path.join(dir_path, "wiki-login.log")

    descriptor = acquire_login_lock(lock_path)
    if descriptor is None:
        return
    write_lock_payload(descriptor)

    try:
        # 워커는 detached 라 부모보다 오래 산다 — 로그 파일은 자식에게 넘기고 부모는 바로 닫는다.
        with open(log_path, "a", encoding="utf-8") as log_handle:
            env = dict(os.environ)
            env[PLUGIN_ROOT_ENV_NAME] = plugin_root

            kwargs: dict = {
                "stdin": subprocess.DEVNULL,
                "stdout": subprocess.DEVNULL,
                "stderr": log_handle,
                "env": env,
            }
            if os.name == "nt":
                kwargs["creationflags"] = (
                    subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
                )
            else:
                kwargs["start_new_session"] = True

            worker_script = os.path.join(plugin_root, "hooks", "wiki-login.py")
            subprocess.Popen(  # noqa: S603
                [sys.executable, worker_script, WORKER_ARG, lock_path], **kwargs
            )
    except Exception:
        # spawn 실패 — 남은 lock 을 정리해 다음 진입에서 재시도할 수 있게 한다.
        with contextlib.suppress(OSError):
            os.remove(lock_path)


def run_background_login_worker(lock_path: str) -> None:
    from shared.wiki_service import browser_login

    try:
        browser_login()
    except Exception as error:
        print(f"[위키 인증] 백그라운드 로그인 실패: {error}", file=sys.stderr)
    finally:
        with contextlib.suppress(OSError):
            os.remove(lock_path)


def run_background_login_worker_from_argv(argv: list[str]) -> bool:
    if WORKER_ARG not in argv:
        return False

    index = argv.index(WORKER_ARG)
    lock_path = argv[index + 1] if index + 1 < len(argv) else None
    # lockPath 없으면 정리할 lock 도 없어 조용히 종료
    if not lock_path:
        return True

    run_background_login_worker(lock_path)
    return True

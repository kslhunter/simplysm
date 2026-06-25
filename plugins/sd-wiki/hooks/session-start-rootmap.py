"""SessionStart hook (플러그인 sd-wiki) — 원격 지식 위키 ROOT MAP 주입.

try/except 로 격리(fail-open, 세션을 막지 않음). 출력은 plain stdout —
SessionStart 는 stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를
stdout 에 절대 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.

ROOT MAP 은 최상위 노드 라우팅 목록만이라 단일 출력으로 hook command 당
~10,000자 truncation 한계 안에 들어옴(청크 분할 불요).

책무: 원격 지식 위키 ROOT MAP 주입(인증 없으면 백그라운드 로그인 트리거 후 fail-open).
(위키 작성·활용 규칙 주입은 session-start-rules.py 가 담당.)
"""
import argparse, json, os, re, sys, subprocess, time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

parser = argparse.ArgumentParser()
parser.add_argument("--wiki-login-worker")
ARGS, _ = parser.parse_known_args()

PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT")
DATA_DIR = Path.home() / ".claude" / "sd"


def _load_wiki_auth():
    if not PLUGIN_ROOT:
        raise RuntimeError("PLUGIN_ROOT 환경변수가 없습니다.")
    scripts_dir = Path(PLUGIN_ROOT) / "scripts"
    scripts_dir_str = str(scripts_dir)
    if scripts_dir_str not in sys.path:
        sys.path.insert(0, scripts_dir_str)
    import wiki_auth

    return wiki_auth


def _run_wiki_login_worker(lock_path_str):
    try:
        wiki_auth = _load_wiki_auth()
        wiki_auth.browser_login()
    except Exception as err:
        print(f"[위키 인증] 백그라운드 로그인 실패: {err}", file=sys.stderr)
    finally:
        try:
            Path(lock_path_str).unlink()
        except OSError:
            pass


if ARGS.wiki_login_worker:
    _run_wiki_login_worker(ARGS.wiki_login_worker)
    sys.exit(0)

try:
    stdin_data = json.load(sys.stdin)
except Exception:
    stdin_data = {}

SESSION_ID = stdin_data.get("session_id")
if not isinstance(SESSION_ID, str) or not SESSION_ID:
    SESSION_ID = None


def _format_remote_wiki_toc(toc):
    if not isinstance(toc, list):
        raise ValueError("위키 ROOT MAP 응답은 배열이어야 합니다.")

    lines = []
    for item in toc:
        if not isinstance(item, dict):
            raise ValueError("위키 ROOT MAP 항목은 객체여야 합니다.")
        topic = item.get("topic")
        if not isinstance(topic, str) or not topic:
            raise ValueError("위키 ROOT MAP 항목에 topic 이 없습니다.")
        title = item.get("title")
        if not isinstance(title, str) or not title:
            raise ValueError("위키 ROOT MAP 항목에 title 이 없습니다.")
        summary = item.get("summary")
        if not isinstance(summary, str):
            raise ValueError("위키 ROOT MAP 항목에 summary 가 없습니다.")
        has_children = item.get("hasChildren")
        if not isinstance(has_children, bool):
            raise ValueError("위키 ROOT MAP 항목에 hasChildren 가 없습니다.")

        line = f"- [{title}]({topic})"
        if summary:
            line += f" — {summary}"
        if has_children:
            line += " (하위 있음)"
        lines.append(line)

    body = "\n".join(lines)
    return "# 지식 위키 ROOT MAP (최상위)\n\n" + (body + "\n" if body else "")


def _trigger_background_wiki_login():
    data_dir = DATA_DIR
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
    except OSError:
        return

    lock_path = data_dir / "wiki-login.lock"
    log_path = data_dir / "wiki-login.log"
    now = time.time()

    if lock_path.exists():
        return

    try:
        fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        return
    except OSError:
        return

    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump({"startedAt": now}, f)

    log_file = None
    try:
        log_file = open(log_path, "a", encoding="utf-8")
        subprocess.Popen(
            [sys.executable, str(Path(__file__).resolve()), "--wiki-login-worker", str(lock_path)],
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


def _wiki_session_skip_path():
    if not SESSION_ID:
        return None
    safe_session_id = re.sub(r"[^A-Za-z0-9_.-]", "_", SESSION_ID)
    return DATA_DIR / f"wiki-session-no-context-{safe_session_id}.lock"


def _mark_wiki_session_without_context():
    skip_path = _wiki_session_skip_path()
    if skip_path is None:
        return
    try:
        skip_path.parent.mkdir(parents=True, exist_ok=True)
        skip_path.write_text(str(time.time()), encoding="utf-8")
    except OSError:
        pass


def _is_wiki_session_without_context():
    skip_path = _wiki_session_skip_path()
    return skip_path is not None and skip_path.exists()


def _fetch_remote_wiki_text():
    if _is_wiki_session_without_context():
        return None

    wiki_auth = _load_wiki_auth()
    import wiki  # wiki.py 가 top-level 에서 wiki_auth 를 import 하므로 _load_wiki_auth() 이후여야 함

    try:
        token = wiki_auth.get_token(allow_browser=False)
    except wiki_auth.WikiAuthExpired:
        _mark_wiki_session_without_context()
        _trigger_background_wiki_login()
        return None
    except wiki_auth.WikiAuthError:
        return None

    if token is None:
        _mark_wiki_session_without_context()
        _trigger_background_wiki_login()
        return None

    try:
        return _format_remote_wiki_toc(wiki.call_service("rootMap", [], token))
    except wiki_auth.WikiAuthExpired:
        _mark_wiki_session_without_context()
        _trigger_background_wiki_login()
        return None
    except Exception:
        return None


# --- 위키 ROOT MAP ---
try:
    wiki_text = _fetch_remote_wiki_text()
    if wiki_text:
        sys.stdout.write("## 개인 지식 위키 ROOT MAP (원격·최상위)\n\n" + wiki_text)
except Exception:
    pass

"""SessionStart hook (플러그인 sd-wiki).

각 책무를 try/except 로 격리(fail-open, 세션을 막지 않음). 출력은 plain stdout —
SessionStart 는 stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를
stdout 에 절대 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.

stdout(=주입 컨텍스트)은 hook command 당 약 10,000자에서 잘리고 프리뷰 2KB만
인라인됨. 이 판정은 hook command 별로 개별 적용되므로, 콘텐츠를 H1/H2 섹션 경계로
~8K 청크로 나눠 `--part N` 으로 분할 출력하고, hooks.json 에서 SessionStart command
를 여러 개(`--part 0..N`) 등록함. 각 part 는 같은 콘텐츠를 동일하게 재청킹한 뒤
자기 청크만 출력하므로(결정적) part 간 경계가 일관됨. 섹션 경계에서만 자르므로
문장·섹션이 중간에서 끊기지 않음. 슬롯이 청크 수보다 많으면 남는 part 는 무출력.
마지막 슬롯(`--last`)은 남은 청크를 모두 떠안고, 슬롯이 부족해 둘 이상이 몰리면
잘림(주입 누락)이 생기므로 silent skip 대신 경고+해결법을 컨텍스트에 출력함.

책무:
  1. 원격 지식 위키 ROOT MAP 주입(인증 없으면 백그라운드 로그인 트리거 후 fail-open).
  2. ${CLAUDE_PLUGIN_ROOT}/rules/*.md 위키 작성·활용 규칙 주입.
"""
import argparse, json, os, re, sys, subprocess, time
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

parser = argparse.ArgumentParser()
parser.add_argument("--part", type=int, default=0)
parser.add_argument("--last", action="store_true")  # 마지막 슬롯: 남은 청크를 모두 떠안음
parser.add_argument("--wiki-login-worker")
ARGS, _ = parser.parse_known_args()
PART = ARGS.part
IS_LAST = ARGS.last

PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT") or os.environ.get("PLUGIN_ROOT")
PLUGIN_DATA = os.environ.get("CLAUDE_PLUGIN_DATA") or os.environ.get("PLUGIN_DATA")


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

# Codex 는 native PLUGIN_ROOT 도 set(Claude 는 CLAUDE_PLUGIN_ROOT 만). 슬롯 부족 경고의
# hooks 파일명 안내에만 사용.
IS_CODEX = "PLUGIN_ROOT" in os.environ

CHUNK_LIMIT = 8000  # 문자 수(바이트 아님). hook 당 ~10,000자 truncation 한계의 안전 마진.

out = []  # plain stdout 으로 주입할 컨텍스트 조각


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
    if not PLUGIN_DATA:
        return

    data_dir = Path(PLUGIN_DATA)
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
    if not PLUGIN_DATA or not SESSION_ID:
        return None
    safe_session_id = re.sub(r"[^A-Za-z0-9_.-]", "_", SESSION_ID)
    return Path(PLUGIN_DATA) / f"wiki-session-no-context-{safe_session_id}.lock"


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


# --- 1. 위키 ROOT MAP ---
try:
    wiki_text = _fetch_remote_wiki_text()
    if wiki_text:
        out.append("## 개인 지식 위키 ROOT MAP (원격·최상위)\n\n" + wiki_text)
except Exception:
    pass

# --- 2. rules 주입 (위키 작성·활용 규칙) ---
try:
    if PLUGIN_ROOT:
        ctx_dir = Path(PLUGIN_ROOT) / "rules"
        for md in sorted(ctx_dir.glob("*.md")):
            out.append(md.read_text(encoding="utf-8"))
except Exception:
    pass


def chunk_by_section(text, limit):
    """H1/H2(`# `·`## `) 헤더 경계로만 분할해 ~limit 문자 청크로 그리디 패킹.
    헤더를 lookahead 로 split 하므로 섹션은 헤더부터 온전히 유지됨(H3 이하는 분할 안 함).
    각 H2 섹션이 limit 미만이면 모든 청크가 limit 이하 → 문장·섹션 중간 절단 없음."""
    secs = [s for s in re.split(r"(?=^#{1,2} )", text, flags=re.M) if s.strip()]
    chunks, cur = [], ""
    for s in secs:
        if cur and len(cur) + len(s) > limit:
            chunks.append(cur)
            cur = s
        else:
            cur += s
    if cur:
        chunks.append(cur)
    return chunks


if out:
    chunks = chunk_by_section("\n\n".join(out), CHUNK_LIMIT)
    if IS_LAST:
        # 마지막 슬롯은 자기 인덱스 이후의 남은 청크를 모두 떠안음. 둘 이상이 몰리면
        # 이 출력이 ~10,000자에서 잘려 일부 룰이 누락되므로, silent 하지 않게 경고+해결법을 앞에 붙임.
        rest = chunks[PART:]
        if len(rest) > 1:
            warn = (
                "## ⚠️ [시스템] SessionStart 룰 주입 슬롯 부족 — 사용자에게 즉시 보고할 것\n\n"
                f"룰 콘텐츠가 {len(chunks)} 청크인데 등록 슬롯이 부족해 마지막 슬롯에 "
                f"{len(rest)} 청크가 몰림 → 이 출력이 ~10,000자에서 잘려 **일부 룰이 컨텍스트에서 누락**될 수 있음. "
                f"해결: `plugins/sd-wiki/hooks/{'hooks-codex.json' if IS_CODEX else 'hooks.json'}` 의 SessionStart 에 `--part N` command 를 늘리고"
                "(`--last` 는 새 마지막 슬롯으로 옮길 것), 또는 `session-start.py` 의 `CHUNK_LIMIT` 를 낮춰 청크 수를 줄일 것.\n"
            )
            sys.stdout.write(warn + "\n" + "\n\n".join(rest))
        elif rest:
            sys.stdout.write(rest[0])
    elif 0 <= PART < len(chunks):
        sys.stdout.write(chunks[PART])

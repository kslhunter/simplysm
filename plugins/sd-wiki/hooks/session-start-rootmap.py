"""SessionStart hook (플러그인 sd-wiki) — 원격 ROOT MAP 주입.

원격 위키에서 ROOT MAP(최상위 라우팅 목록)을 받아 주입. 미인증·만료면 백그라운드
로그인을 wiki_login 에 위임한 뒤 무주입 fail-open. 인증·네트워크·코어(wiki_core)에
의존하는 동적 주입 — 의존이 전혀 다른 정적 규칙 주입(session-start-rules.py)과 별개
파일·별개 SessionStart command 로 분리돼 있다.

출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단·에러는 stdout 에 절대
찍지 않음(stderr 만).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT")


def _read_session_id() -> str | None:
    try:
        stdin_data = json.load(sys.stdin)
    except Exception:
        stdin_data = {}
    sid = stdin_data.get("session_id") if isinstance(stdin_data, dict) else None
    return sid if isinstance(sid, str) and sid else None


def _format_rootmap(rootmap: object) -> str:
    if not isinstance(rootmap, list):
        raise ValueError("위키 ROOT MAP 응답은 배열이어야 합니다.")

    lines = []
    for item in rootmap:
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


def _import_wiki_core():
    if not PLUGIN_ROOT:
        raise RuntimeError("CLAUDE_PLUGIN_ROOT 환경변수가 없습니다.")
    scripts_dir = str(Path(PLUGIN_ROOT) / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    import wiki_core

    return wiki_core


def inject_rootmap() -> None:
    session_id = _read_session_id()

    # hooks/ 는 실행 시 sys.path[0] 이므로 형제 wiki_login 을 경로 조작 없이 import.
    import wiki_login

    if session_id and wiki_login.is_session_skipped(session_id):
        return

    wiki_core = _import_wiki_core()

    def _defer_login() -> None:
        # 미인증·만료: 이 세션은 위키 없이 진행하고, 백그라운드 로그인만 1회 트리거.
        if session_id:
            wiki_login.mark_session_skipped(session_id)
        wiki_login.trigger_background_login()

    try:
        token = wiki_core.get_token(allow_browser=False)
    except wiki_core.WikiAuthExpired:
        _defer_login()
        return
    except wiki_core.WikiAuthError:
        # 네트워크·서버 오류 — 만료가 아니므로 로그인 트리거 없이 fail-open.
        return

    if token is None:
        _defer_login()
        return

    try:
        rootmap = wiki_core.call_service("rootMap", [], token)
    except wiki_core.WikiAuthExpired:
        _defer_login()
        return
    except Exception:
        return

    # 응답 손상이면 _format_rootmap 이 raise → _main 의 try 가 무주입 fail-open.
    text = _format_rootmap(rootmap)
    sys.stdout.write("## 개인 지식 위키 ROOT MAP (원격·최상위)\n\n" + text)


def _main() -> int:
    try:
        inject_rootmap()
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(_main())

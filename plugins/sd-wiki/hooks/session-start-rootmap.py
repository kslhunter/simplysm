"""SessionStart hook (플러그인 sd-wiki) — 원격 ROOT MAP 주입.

원격 위키에서 ROOT MAP(최상위 라우팅 목록)을 받아 주입. 미인증, 만료면 백그라운드
로그인만 걸어두고 무주입 fail-open. 인증, 네트워크에 의존하는 동적 주입이라,
의존이 전혀 다른 정적 rules 주입(session-start-reference-rules.py)과 별개 파일, 별개 훅으로 분리돼 있다.

출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단, 에러는 stdout 에 절대 찍지 않음(stderr 만).
"""

from __future__ import annotations

import contextlib
import os
from collections.abc import Callable
from typing import Any

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.wiki_login import (
    is_session_skipped,
    mark_session_skipped,
    trigger_background_login,
)
from shared.wiki_service import (
    WikiAuthError,
    WikiAuthExpired,
    call_service,
    get_token,
)
from shared.wiki_util import configure_stdio, read_stdin_json_record


def read_session_id() -> str | None:
    data = read_stdin_json_record()
    session_id = data.get("session_id") if data else None
    return session_id if isinstance(session_id, str) and session_id else None


def fetch_rootmap(defer_login: Callable[[], None]) -> Any | None:
    try:
        token = get_token(allow_browser=False)
    except WikiAuthExpired:
        defer_login()
        return None
    except WikiAuthError:
        return None

    if token is None:
        defer_login()
        return None

    try:
        return call_service("rootMap", [], token)
    except WikiAuthExpired:
        defer_login()
        return None
    except Exception:
        return None


def format_rootmap_items(rootmap: Any) -> str:
    if not isinstance(rootmap, list):
        raise ValueError("위키 ROOT MAP 응답은 배열이어야 합니다.")

    lines: list[str] = []
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

    return "\n".join(lines)


def inject_rootmap() -> None:
    session_id = read_session_id()

    if session_id and is_session_skipped(session_id):
        return
    if not os.environ.get("CLAUDE_PLUGIN_ROOT"):
        return

    def defer_login() -> None:
        # 미인증, 만료: 이 세션은 위키 없이 진행하고, 백그라운드 로그인만 1회 트리거.
        if session_id:
            mark_session_skipped(session_id)
        trigger_background_login()

    rootmap = fetch_rootmap(defer_login)
    if rootmap is None:
        return

    # 응답 손상이면 format_rootmap_items 가 raise → main 의 except 가 무주입 fail-open.
    items = format_rootmap_items(rootmap)
    print(f"## 원격 공용 위키 ROOT MAP (최상위)\n\n{items or 'ROOT MAP 항목 없음'}", end="")


def main() -> None:
    # SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
    with contextlib.suppress(Exception):
        inject_rootmap()


configure_stdio()
main()

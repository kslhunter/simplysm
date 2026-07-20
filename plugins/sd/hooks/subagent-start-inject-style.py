"""SubagentStart hook — 서브에이전트에 워크스페이스 행동지침을 주입한다.

메인 대화 전용 구간은 걷어낸다(서브에이전트는 사용자와 직접 대화할 통로가 없어 멈춤을 유발).
지침을 못 읽으면 공백으로 두지 않고 원문을 그대로 싣고 실패 사실을 보고하도록 지시한다.
"""

from __future__ import annotations

import json
import os
import re

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    as_record,
    configure_stdio,
    format_error_message,
    read_stdin_json,
    resolve_plugin_root,
)

MARKER_START = "<!-- main-only:start -->"
MARKER_END = "<!-- main-only:end -->"

SUBAGENT_PREAMBLE = "\n".join([
    "아래는 이 워크스페이스의 최우선 행동지침입니다. 모든 판단, 조사, 출력에 그대로 적용하세요.",
    "당신은 서브에이전트라 사용자와 직접 대화할 통로가 없습니다.",
    "`논의`나 승인이 필요한 지점을 만나면 멈추지 말고, 그 지점과 선택지를 호출자에게 보고하세요.",
])


class MarkerPairError(Exception):
    pass


def main() -> None:
    data = read_stdin_json()
    if not is_target_agent(data):
        return

    style_path = os.path.join(resolve_plugin_root(data, __file__), "output-styles", "sd.md")

    try:
        raw = read_text(style_path)
        context = "\n\n".join([SUBAGENT_PREAMBLE, strip_main_only(strip_frontmatter(raw))])
    except Exception as error:
        # SubagentStart 는 spawn 을 막을 수 없어 여기서 throw 해도 서브에이전트는 그대로 실행됩니다.
        # 지침 공백을 만들지 않도록 원문을 그대로 싣고, 실패 사실을 보고에 드러내도록 지시합니다.
        context = build_fallback_context(style_path, error)

    print(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "SubagentStart",
                    "additionalContext": context,
                }
            },
            ensure_ascii=False,
        ),
        end="",
    )


def is_target_agent(data: object) -> bool:
    record = as_record(data)
    agent_type = record.get("agent_type") if record else None
    if not isinstance(agent_type, str):
        return False
    return agent_type == "general-purpose" or agent_type.startswith("sd:")


def read_text(file_path: str) -> str:
    with open(file_path, encoding="utf-8") as handle:
        return handle.read()


def strip_frontmatter(source: str) -> str:
    """output style 메타데이터(name, force-for-plugin 등)는 지침이 아니므로 걷어냅니다."""
    return re.sub(r"\A---\r?\n[\s\S]*?\r?\n---[^\n]*\r?\n", "", source)


def strip_main_only(source: str) -> str:
    """`main-only` 구간을 제거합니다.

    해당 구간은 메인 대화 전용 규칙(`논의`, 작업수행 게이트)이라 서브에이전트에 주면 멈춤을
    유발합니다. 마커 짝이 맞지 않으면 잘라낸 범위를 신뢰할 수 없으므로 raise 해 fallback 으로
    넘깁니다.
    """
    segments: list[str] = []
    cursor = 0

    while True:
        start = source.find(MARKER_START, cursor)
        if start == -1:
            break

        end = source.find(MARKER_END, start)
        if end == -1:
            raise MarkerPairError(f"{MARKER_START} 에 대응하는 {MARKER_END} 가 없습니다.")

        segments.append(source[cursor:start])
        cursor = end + len(MARKER_END)

    if source.find(MARKER_END, cursor) != -1:
        raise MarkerPairError(f"{MARKER_START} 없이 {MARKER_END} 가 나타납니다.")

    segments.append(source[cursor:])
    return re.sub(r"(\r?\n){3,}", "\n\n", "".join(segments)).strip()


def build_fallback_context(style_path: str, error: Exception) -> str:
    notice = "\n".join([
        f"IMPORTANT: 행동지침({style_path}) 로드에 실패했습니다 — {format_error_message(error)}",
        "최종 보고 첫 줄에 이 실패 사실을 그대로 포함해 호출자가 인지하게 하세요.",
    ])

    try:
        return "\n\n".join([notice, SUBAGENT_PREAMBLE, read_text(style_path).strip()])
    except OSError:
        return notice


configure_stdio()
main()

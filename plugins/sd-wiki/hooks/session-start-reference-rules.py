"""SessionStart hook — rules 파일 1개를 인자로 받아 그 파일만 주입한다.

훅 stdout 1개당 주입 1건이고 출력이 크면 잘려 파일로 밀려나므로, hooks.json 에 파일별 훅을
등록해 나눠 주입한다. rules 파일을 추가, 개명하면 hooks.json 등록도 함께 갱신해야 하고,
파일이 커지면 주입이 잘리므로 한 파일을 과도하게 키우지 않는다.
"""

from __future__ import annotations

import os
import re
import sys

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.wiki_util import configure_stdio, read_stdin_json_record


def resolve_plugin_root(data: dict | None) -> str:
    env_plugin_root = os.environ.get("CLAUDE_PLUGIN_ROOT")
    if env_plugin_root:
        return env_plugin_root

    if data:
        for key in ("plugin_root", "pluginRoot"):
            value = data.get(key)
            if isinstance(value, str) and value:
                return value

    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def build_rule_file_context(plugin_root: str | None, file_name: str) -> str | None:
    if not plugin_root:
        return None

    rule_path = os.path.join(plugin_root, "rules", file_name)
    if not os.path.exists(rule_path):
        return None

    with open(rule_path, encoding="utf-8") as handle:
        content = re.sub(r"\A---\r?\n[\s\S]*?\r?\n---\r?\n?", "", handle.read()).strip()

    if not content:
        return None

    return content.replace("${CLAUDE_PLUGIN_ROOT}", plugin_root.replace("\\", "/"))


def main() -> None:
    try:
        if len(sys.argv) < 2:
            return

        data = read_stdin_json_record()
        context = build_rule_file_context(resolve_plugin_root(data), sys.argv[1])
        if context:
            print(context, end="")
    except Exception:
        # SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
        pass


configure_stdio()
main()

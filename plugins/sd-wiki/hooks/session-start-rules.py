"""SessionStart hook (플러그인 sd-wiki) — 작성·활용 규칙 주입.

rules/*.md 를 읽어 ${CLAUDE_PLUGIN_ROOT} 치환 후 stdout 주입. 네트워크·코어(wiki_core)
의존이 전혀 없는 정적 주입 — 인증·네트워크에 의존하는 동적 ROOT MAP 주입
(session-start-rootmap.py)과 별개 파일·별개 SessionStart command 로 분리돼 있다.

출력은 plain stdout 으로 그대로 컨텍스트에 주입되므로 진단·에러는 stderr 만.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT")


def inject_rules() -> None:
    if not PLUGIN_ROOT:
        return
    ctx_dir = Path(PLUGIN_ROOT) / "rules"
    out = []
    for md in sorted(ctx_dir.glob("*.md")):
        out.append(md.read_text(encoding="utf-8").replace("${CLAUDE_PLUGIN_ROOT}", PLUGIN_ROOT))
    if out:
        sys.stdout.write("\n\n".join(out))


def _main() -> int:
    try:
        inject_rules()
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(_main())

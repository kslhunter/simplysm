"""SessionStart hook (플러그인 sd-wiki) — 위키 작성·활용 규칙 주입.

try/except 로 격리(fail-open, 세션을 막지 않음). 출력은 plain stdout —
SessionStart 는 stdout 텍스트를 그대로 컨텍스트에 주입하므로, 진단/에러 로그를
stdout 에 절대 찍지 않음(섞이면 컨텍스트가 오염됨). 필요한 로그는 stderr 로.

rules 콘텐츠는 단일 출력으로 hook command 당 ~10,000자 truncation 한계 안에
들어옴(청크 분할 불요).

책무: ${CLAUDE_PLUGIN_ROOT}/rules/*.md 위키 작성·활용 규칙 주입.
(원격 지식 위키 ROOT MAP 주입은 session-start-rootmap.py 가 담당.)
"""
import os, sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

PLUGIN_ROOT = os.environ.get("CLAUDE_PLUGIN_ROOT")

out = []
try:
    if PLUGIN_ROOT:
        ctx_dir = Path(PLUGIN_ROOT) / "rules"
        for md in sorted(ctx_dir.glob("*.md")):
            out.append(md.read_text(encoding="utf-8").replace("${CLAUDE_PLUGIN_ROOT}", PLUGIN_ROOT))
except Exception:
    pass

if out:
    sys.stdout.write("\n\n".join(out))

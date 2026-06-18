"""SessionStart 훅 — d:\\wiki 의 지식 위키 목차(index.md)를 세션 컨텍스트에 주입.

index.md 가 없으면 빈 카탈로그를 자동 생성(부트스트랩)하므로 신규 환경에서도 항상 동작.
위키 사용 지침(언제 읽고 갱신하는지)은 .claude/rules/sd-wiki.md 에 있음.
경로는 환경 불문 d:\\wiki 로 고정.
"""
import sys
from pathlib import Path

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

WIKI_DIR = Path("d:/wiki")
index_path = WIKI_DIR / "index.md"

# 없으면 빈 카탈로그 생성(부트스트랩). 디스크/경로 문제 시 세션을 막지 않음(fail-open).
if not index_path.is_file():
    try:
        WIKI_DIR.mkdir(parents=True, exist_ok=True)
        index_path.write_text("# 지식 위키 목차\n\n_아직 등재된 페이지 없음._\n", encoding="utf-8")
    except Exception:
        sys.exit(0)

sys.stdout.write(f"## 개인 지식 위키 목차 ({index_path})\n\n")
sys.stdout.write(index_path.read_text(encoding="utf-8"))

"""UserPromptSubmit hook (플러그인 sd-wiki).

매 프롬프트 제출 시 위키 반영 후보의 심사 기준을 프롬프트 옆에 재노출.
SessionStart 1회 주입만으론 작업 중 위키 갱신이 거의 발동되지 않으므로,
관련성의 순간(매 턴)에 다시 띄워 salience 확보. 상세 규칙은 SessionStart 가
주입하는 wiki.md 가 담고 있지만, 무분별한 기록을 막기 위해 핵심 제외 기준도
여기서 함께 노출한다. 출력은 hookSpecificOutput.
additionalContext 를 담은 JSON 한 덩이 — 진단/에러를 stdout 에 찍으면 JSON
파싱이 깨져 주입 컨텍스트가 유실되므로 절대 찍지 않음(fail-open).
"""
import json, sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

try:
    context = (
        "[위키] 종료 전 위키 반영은 '다음에 비슷한 상황에서 다시 열어 시간을 아낄 "
        "비자명·반복 지식'을 새로 확인한 경우만 한다. 애매하면 쓰지 않는다. "
        "작업 기록·이번 변경 요약·1회성 의사결정·단순 문서 요약·과거 기록물은 쓰지 않는다. "
        "반영 시 wiki.md 규칙대로 위키 CLI(`wiki.py`) 로 기존 페이지를 우선 갱신하고, "
        "목차 요약은 라우팅 한 줄만 유지한다."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": context,
        }
    }, ensure_ascii=False))
except Exception:
    pass

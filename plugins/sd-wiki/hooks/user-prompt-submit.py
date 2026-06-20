"""UserPromptSubmit hook (플러그인 sd).

매 프롬프트 제출 시 위키 갱신 의무를 프롬프트 옆에 한 줄로 재노출.
SessionStart 1회 주입만으론 작업 중 위키 갱신이 거의 발동되지 않으므로,
관련성의 순간(매 턴)에 다시 띄워 salience 확보. 상세 규칙은 SessionStart 가
주입하는 wiki.md 가 담고 있어 여기선 트리거만. 출력은 hookSpecificOutput.
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
        "[위키] 이번 응답에서 오래 재사용될 지식(빌드·실행 명령, 디버깅 원인·해결, "
        "라이브러리·API 동작, 설계 결정, 반복 패턴 등)을 새로 알게 됐다면, 종료 전 "
        "wiki.md 규칙대로 `~/.claude/wiki` 에 반영(겹치면 기존 페이지 갱신·중복 금지, "
        "`index.md` 요약 갱신). 해당 없으면 무시."
    )
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "UserPromptSubmit",
            "additionalContext": context,
        }
    }, ensure_ascii=False))
except Exception:
    pass

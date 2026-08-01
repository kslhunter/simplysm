"""UserPromptSubmit hook (플러그인 sd).

매 프롬프트 제출 시 sd 응답 규칙 핵심을 프롬프트 옆에 재노출.
SessionStart 1회 주입(sd.md)만으론 작업 중 응답 규칙이 흐려지므로,
관련성의 순간(매 턴)에 다시 띄워 salience 확보. 세부 규칙은 SessionStart 가
주입하는 sd.md 에 위임하고, 여기선 핵심만 짧게 상기시킨다.

fail-open 으로 격리한다. 출력은 plain stdout — UserPromptSubmit 는 stdout 텍스트를
그대로 컨텍스트에 주입하므로, 진단/에러 로그를 stdout 에 절대 찍지 않는다.
"""

from __future__ import annotations

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import configure_stdio

SD_REMINDER = """사용자 가독성 최우선:
- 한 줄에 문장 하나, 정보 하나. 산문 덩어리 대신 불릿·단계로 구조화.
- 조사·서술어를 살린 자연스러운 한국어. 명사 나열·번역체·에두름 금지.
- 결론부터 핵심만 간결하게.
- 결론에 이른 배경(조사 경위·수정 위치)은 사용자가 물을 때만."""

try:
    configure_stdio()
    print(SD_REMINDER, end="")
except Exception:
    # UserPromptSubmit context 주입 실패는 프롬프트 제출을 막지 않습니다.
    pass

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

SD_REMINDER = "sd plugin is active. 줄일 것은 내용이고 낱말이 아닙니다. 조사와 서술어를 살려 서술식으로 쓰세요."

try:
    configure_stdio()
    print(SD_REMINDER, end="")
except Exception:
    # UserPromptSubmit context 주입 실패는 프롬프트 제출을 막지 않습니다.
    pass

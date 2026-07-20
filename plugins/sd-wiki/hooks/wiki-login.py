"""비차단 백그라운드 로그인 워커 진입점 (플러그인 sd-wiki hook).

미인증, 만료 시 `session-start-rootmap.py` 가 걸어두는 백그라운드 브라우저 로그인의 실행 지점.
락, 워커 공통 로직은 shared/wiki_login.py 에 둔다.
"""

from __future__ import annotations

import sys

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.wiki_login import run_background_login_worker_from_argv
from shared.wiki_util import configure_stdio

configure_stdio()
run_background_login_worker_from_argv(sys.argv[1:])

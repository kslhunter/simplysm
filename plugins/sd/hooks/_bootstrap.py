"""훅 진입점이 플러그인 루트를 import 경로에 넣기 위한 부트스트랩.

훅은 `python hooks/<name>.py` 로 실행되어 sys.path[0] 이 hooks/ 가 되므로,
상위의 `shared` 패키지를 찾지 못한다. 각 훅이 첫 줄에서 이 모듈을 import 한다.
"""

from __future__ import annotations

import sys
from pathlib import Path

PLUGIN_ROOT = Path(__file__).resolve().parent.parent
if str(PLUGIN_ROOT) not in sys.path:
    sys.path.insert(0, str(PLUGIN_ROOT))

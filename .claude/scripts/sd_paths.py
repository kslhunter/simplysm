"""공용 경로 헬퍼.

실행 위치는 항상 프로젝트 루트라고 가정한다 (cd 금지 규칙).
"""
from __future__ import annotations

import json
import tempfile
from pathlib import Path


def resolve_tmp_base() -> Path:
    """프로젝트 루트의 .claude/simplysm.json 의 tmpdir → 없으면 OS tmp."""
    cfg_path = Path(".claude/simplysm.json")
    if cfg_path.exists():
        try:
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            if cfg.get("tmpdir"):
                return Path(cfg["tmpdir"])
        except Exception:
            pass
    return Path(tempfile.gettempdir())

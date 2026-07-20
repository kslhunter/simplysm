"""SessionStart hook — 프로젝트가 의존하는 simplysm 버전의 references 안내를 주입한다.

stdout 이 곧 컨텍스트라 진단은 절대 stdout 에 쓰지 않는다. 주입 실패는 세션 시작을 막지 않는다.
주입 텍스트의 경로 표기는 슬래시로 통일한다.
"""

from __future__ import annotations

import json
import os
import re

import _bootstrap  # noqa: F401  (sys.path 준비)
from shared.hook_io import (
    configure_stdio,
    read_stdin_json,
    resolve_plugin_root,
    resolve_project_dir,
)

PATH_WARNING = (
    "- 위 경로는 sd 플러그인 설치 위치다. 참조(Read) 전용 — "
    "현재 작업 프로젝트가 아니며, 이 경로 기준으로 파일을 생성, 수정하지 않는다."
)


def to_posix_path(file_path: str) -> str:
    return file_path.replace("\\", "/")


def read_simplysm_major(project_dir: str | os.PathLike[str]) -> str | None:
    package_path = os.path.join(os.fspath(project_dir), "package.json")
    if not os.path.exists(package_path):
        return None

    with open(package_path, encoding="utf-8") as handle:
        package_json = json.load(handle)

    package_record = package_json if isinstance(package_json, dict) else {}
    dependency_range = lookup_dependency(
        package_record, "dependencies"
    ) or lookup_dependency(package_record, "devDependencies")

    if dependency_range is None:
        return None

    match = re.search(r"\d+", str(dependency_range))
    return match.group(0) if match else None


def lookup_dependency(package_record: dict, field: str) -> object | None:
    section = package_record.get(field)
    return section.get("@simplysm/sd-cli") if isinstance(section, dict) else None


def build_context(
    project_dir: str | os.PathLike[str],
    plugin_root: str | os.PathLike[str] | None,
) -> str | None:
    if not plugin_root:
        return None

    reference_root = os.path.join(os.fspath(plugin_root), "references")
    major = read_simplysm_major(project_dir)

    if not major:
        return "\n".join([
            f"## 활성 simplysm references (`{to_posix_path(reference_root)}`)",
            "",
            PATH_WARNING,
            "- (`@simplysm/sd-cli` 의존 미선언 — 버전별 `simplysm<major>` references 비활성)",
        ])

    base = os.path.join(reference_root, f"simplysm{major}")
    readme_path = os.path.join(base, "README.md")
    if not os.path.exists(readme_path):
        return "\n".join([
            f"## 활성 simplysm references (`{to_posix_path(base)}`)",
            "",
            PATH_WARNING,
            f"- (`simplysm{major}` references 디렉터리 없음)",
        ])

    with open(readme_path, encoding="utf-8") as handle:
        readme = handle.read().strip()

    return "\n".join([
        f"## 활성 simplysm references (`{to_posix_path(base)}`)",
        "",
        PATH_WARNING,
        "",
        f"아래는 `{to_posix_path(readme_path)}` 전문. "
        f"본문의 `./` 상대링크는 `{to_posix_path(base)}` 기준으로 Read.",
        "",
        readme,
    ])


def main() -> None:
    try:
        data = read_stdin_json()
        context = build_context(
            project_dir=resolve_project_dir(data),
            plugin_root=resolve_plugin_root(data, __file__),
        )
        if context:
            print(context, end="")
    except Exception:
        # SessionStart context 주입 실패는 세션 시작을 막지 않습니다.
        pass


configure_stdio()
main()

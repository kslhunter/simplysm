"""원격 위키 CLI (플러그인 sd-wiki).

에이전트가 Bash 로 능동 호출하는 진입점. 인자 파싱 → `wiki_core` 위임 → JSON 출력만
담당. 원격 호출·인증·충돌 재시도 등 메커니즘은 전부 `wiki_core` 에 있고 이 파일엔 없음
(명령 추가·변경 시 이 파일만 보면 됨).

  python "${CLAUDE_PLUGIN_ROOT}/scripts/wiki.py" <명령> ...

stdout 은 서비스 응답 JSON, 오류는 stderr + 비0 종료코드.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# 에이전트의 일반 셸엔 CLAUDE_PLUGIN_* env 가 없으므로 코어는 env 가 아니라 형제 경로로
# 찾음 — 직접 실행 시 sys.path[0] 이 이미 scripts/ 지만, 다른 cwd·import 경로에서도
# 견고하도록 자신의 디렉터리를 보강한다.
_SCRIPTS_DIR = str(Path(__file__).resolve().parent)
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

import wiki_core  # noqa: E402


for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _print_json(data: Any) -> None:
    sys.stdout.write(json.dumps(data, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")


def _read_body_arg(args: argparse.Namespace) -> str:
    if args.body is not None and args.body_file is not None:
        raise wiki_core.WikiApiError("--body 와 --body-file 은 함께 쓸 수 없습니다.")
    if args.body is not None:
        return args.body
    if args.body_file is not None:
        try:
            return Path(args.body_file).read_text(encoding="utf-8")
        except OSError as err:
            raise wiki_core.WikiApiError(f"본문 파일을 읽을 수 없습니다: {err}") from err
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise wiki_core.WikiApiError("본문은 --body, --body-file 또는 stdin 으로 입력해야 합니다.")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="원격 위키 CLI")
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="토큰이 없을 때 브라우저 로그인을 띄우지 않고 종료합니다.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    read_parser = subparsers.add_parser("read", help="topic 으로 페이지를 읽습니다.")
    read_parser.add_argument("topic")

    write_parser = subparsers.add_parser("write", help="페이지를 생성하거나 갱신합니다.")
    write_parser.add_argument("topic")
    write_parser.add_argument("--title", required=True)
    write_parser.add_argument("--summary", required=True)
    write_parser.add_argument("--body")
    write_parser.add_argument("--body-file")
    write_parser.add_argument("--base-version", type=int)
    write_parser.add_argument("--parent", help="상위 페이지 topic. 생략 시 기존 상위 유지(신규는 최상위).")

    search_parser = subparsers.add_parser("search", help="키워드로 페이지를 검색합니다.")
    search_parser.add_argument("keyword")

    subparsers.add_parser("toc", help="목차를 조회합니다.")
    subparsers.add_parser("rootmap", help="최상위 노드의 라우팅 목록을 조회합니다.")

    children_parser = subparsers.add_parser("children", help="직속 자식 노드의 라우팅 목록을 조회합니다.")
    children_parser.add_argument("topic")

    delete_parser = subparsers.add_parser("delete", help="페이지를 삭제합니다(자식은 상위로 재배치).")
    delete_parser.add_argument("topic")
    delete_parser.add_argument("--base-version", type=int)

    move_parser = subparsers.add_parser("move", help="내용 변경 없이 상위 페이지만 이동합니다(순수 이동).")
    move_parser.add_argument("topic")
    move_group = move_parser.add_mutually_exclusive_group(required=True)
    move_group.add_argument("--parent", help="새 상위 페이지 topic.")
    move_group.add_argument("--root", action="store_true", help="최상위(루트)로 이동.")

    subparsers.add_parser("lint", help="위키 무결성·트리·링크를 점검합니다.")
    return parser


def _run_command(args: argparse.Namespace, token: str) -> Any:
    if args.command == "read":
        return wiki_core.call_service("read", [args.topic], token)
    if args.command == "search":
        return wiki_core.call_service("search", [args.keyword], token)
    if args.command == "toc":
        return wiki_core.call_service("toc", [], token)
    if args.command == "rootmap":
        return wiki_core.call_service("rootMap", [], token)
    if args.command == "children":
        return wiki_core.call_service("children", [args.topic], token)
    if args.command == "write":
        input_data: dict[str, Any] = {
            "topic": args.topic,
            "title": args.title,
            "summary": args.summary,
            "body": _read_body_arg(args),
        }
        if args.base_version is not None:
            input_data["baseVersion"] = args.base_version
        if args.parent is not None:
            input_data["parentTopic"] = args.parent
        return wiki_core.write_page(input_data, token)
    if args.command == "delete":
        delete_input: dict[str, Any] = {"topic": args.topic}
        if args.base_version is not None:
            delete_input["baseVersion"] = args.base_version
        return wiki_core.call_service("delete", [delete_input], token)
    if args.command == "move":
        parent_topic = None if args.root else args.parent
        return wiki_core.call_service("move", [{"topic": args.topic, "parentTopic": parent_topic}], token)
    if args.command == "lint":
        return wiki_core.call_service("lint", [], token)
    raise wiki_core.WikiApiError(f"알 수 없는 명령: {args.command}")


def _main(argv: list[str]) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    allow_browser = not args.no_browser

    try:
        token = wiki_core.get_token(allow_browser=allow_browser)
        if token is None:
            return 1
        try:
            result = _run_command(args, token)
        except wiki_core.WikiAuthExpired:
            if not allow_browser:
                raise
            token = wiki_core.browser_login()
            result = _run_command(args, token)
    except wiki_core.WikiWriteConflict as err:
        # 충돌은 실패(비0 종료)로 알리되, 재통합에 필요한 최신 본문을 stdout 으로 함께 전달.
        _print_json({"conflict": True, "message": str(err), "latest": err.latest})
        return 3
    except wiki_core.WikiAuthError as err:
        print(f"위키 인증 오류: {err}", file=sys.stderr)
        return 2
    except wiki_core.WikiApiError as err:
        print(f"위키 API 오류: {err}", file=sys.stderr)
        return 2

    _print_json(result)
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))

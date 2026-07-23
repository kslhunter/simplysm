"""원격 위키 CLI (플러그인 sd-wiki).

에이전트가 셸로 능동 호출하는 진입점. 인자 파싱 → `shared/wiki_service` 위임 → JSON 출력만
담당. 원격 호출, 인증, 충돌 처리 등 메커니즘은 전부 `shared/wiki_service` 에 있고 이 파일엔 없음
(명령 추가, 변경 시 이 파일만 보면 됨).

  python "${CLAUDE_PLUGIN_ROOT}/cli/wiki.py" <명령> ...

stdout 은 서비스 응답 JSON, 오류는 stderr + 비0 종료코드.
종료코드: 0=성공, 1=토큰 없음, 2=인자, API 오류, 3=쓰기 충돌.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from shared.wiki_service import (  # noqa: E402
    WikiApiError,
    WikiAuthError,
    WikiAuthExpired,
    WikiWriteConflict,
    browser_login,
    call_service,
    clear_token,
    get_token,
    write_page,
)
from shared.wiki_util import (  # noqa: E402
    configure_stdio,
    decode_utf8_strict,
    get_error_message,
)


class CliParseError(Exception):
    pass


class CliParser(argparse.ArgumentParser):
    """인자 오류를 종료코드 2 로 통일한다 — argparse 기본값(2)과 같지만 메시지 경로를 우리가 잡는다."""

    def error(self, message: str) -> None:  # type: ignore[override]
        raise CliParseError(message)


def build_parser() -> CliParser:
    parser = CliParser(prog="wiki", add_help=False)
    parser.add_argument("--no-browser", action="store_true")
    subparsers = parser.add_subparsers(dest="command", required=True)

    for name in ("read", "children"):
        sub = subparsers.add_parser(name, add_help=False)
        sub.add_argument("topic")

    for name in ("toc", "rootmap", "lint", "login"):
        subparsers.add_parser(name, add_help=False)

    search = subparsers.add_parser("search", add_help=False)
    search.add_argument("keyword")

    delete = subparsers.add_parser("delete", add_help=False)
    delete.add_argument("topic")
    delete.add_argument("--base-version", type=int)

    write = subparsers.add_parser("write", add_help=False)
    write.add_argument("topic")
    write.add_argument("--title", required=True)
    write.add_argument("--summary", required=True)
    write.add_argument("--body")
    write.add_argument("--body-file")
    write.add_argument("--base-version", type=int)
    write.add_argument("--parent")

    move = subparsers.add_parser("move", add_help=False)
    move.add_argument("topic")
    move.add_argument("--parent")
    move.add_argument("--root", action="store_true")

    return parser


def parse_argv(argv: list[str]) -> argparse.Namespace:
    args = build_parser().parse_args(argv)

    if args.command == "move" and bool(args.parent) == bool(args.root):
        raise CliParseError("move 명령에는 --parent 또는 --root 중 하나가 필요합니다.")

    if args.command == "login" and args.no_browser:
        raise CliParseError("login 명령은 --no-browser 와 함께 쓸 수 없습니다.")

    return args


def print_json(data: Any) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=2))


def read_body_file(file_path: str) -> str:
    try:
        with open(file_path, "rb") as handle:
            payload = handle.read()
    except OSError as error:
        raise WikiApiError(
            f"본문 파일을 읽을 수 없습니다: {get_error_message(error)}"
        ) from error
    return decode_utf8_strict(payload)


def read_body_arg(args: argparse.Namespace) -> str:
    if args.body is not None and args.body_file is not None:
        raise WikiApiError("--body 와 --body-file 은 함께 쓸 수 없습니다.")
    if args.body is not None:
        return args.body
    if args.body_file is not None:
        return read_body_file(args.body_file)
    if sys.stdin is not None and not sys.stdin.isatty():
        return sys.stdin.read()
    raise WikiApiError("본문은 --body, --body-file 또는 stdin 으로 입력해야 합니다.")


def run_command(args: argparse.Namespace, token: str, write_body: str | None) -> Any:
    if args.command == "read":
        return call_service("read", [args.topic], token)
    if args.command == "children":
        return call_service("children", [args.topic], token)
    if args.command == "search":
        return call_service("search", [args.keyword], token)
    if args.command == "toc":
        return call_service("toc", [], token)
    if args.command == "rootmap":
        return call_service("rootMap", [], token)
    if args.command == "lint":
        return call_service("lint", [], token)

    if args.command == "write":
        input_data: dict[str, Any] = {
            "topic": args.topic,
            "title": args.title,
            "summary": args.summary,
            "body": write_body,
        }
        if args.base_version is not None:
            input_data["baseVersion"] = args.base_version
        if args.parent is not None:
            input_data["parentTopic"] = args.parent
        return write_page(input_data, token)

    if args.command == "delete":
        delete_input: dict[str, Any] = {"topic": args.topic}
        if args.base_version is not None:
            delete_input["baseVersion"] = args.base_version
        return call_service("delete", [delete_input], token)

    if args.command == "move":
        parent_topic = None if args.root else args.parent
        return call_service(
            "move", [{"topic": args.topic, "parentTopic": parent_topic}], token
        )

    raise WikiApiError(f"알 수 없는 명령: {args.command}")


def main(argv: list[str]) -> int:
    try:
        args = parse_argv(argv)
    except CliParseError as error:
        print(str(error), file=sys.stderr)
        return 2

    allow_browser = not args.no_browser

    try:
        if args.command == "login":
            # 강제 재로그인 — 저장된 토큰을 폐기해야 자동 refresh 를 타지 않고 브라우저가 뜬다.
            clear_token()
            browser_login()
            print_json({"success": True})
            return 0

        token = get_token(allow_browser)
        if token is None:
            print(
                "위키 인증 토큰이 없습니다 (--no-browser: 브라우저 로그인을 생략했습니다).",
                file=sys.stderr,
            )
            return 1

        # 본문은 재시도 전에 1회만 읽는다 — 재시도 때 이미 EOF 인 stdin 을 재독하면 무한 대기가 되므로.
        write_body = read_body_arg(args) if args.command == "write" else None

        try:
            result = run_command(args, token, write_body)
        except WikiAuthExpired:
            if not allow_browser:
                raise
            token = browser_login()
            result = run_command(args, token, write_body)

        print_json(result)
        return 0
    except WikiWriteConflict as error:
        # 충돌은 실패(비0 종료)로 알리되, 재통합에 필요한 최신 본문을 stdout 으로 함께 전달.
        print_json({"conflict": True, "message": str(error), "latest": error.latest})
        return 3
    except WikiAuthError as error:
        print(f"위키 인증 오류: {error}", file=sys.stderr)
        return 2
    except WikiApiError as error:
        print(f"위키 API 오류: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    configure_stdio()
    sys.exit(main(sys.argv[1:]))

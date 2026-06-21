"""원격 위키 CLI 래퍼 (플러그인 sd-wiki).

opus `WikiService` HTTP API 를 Bash 에서 호출하기 위한 얇은 명령.
인증 토큰 발급·갱신은 같은 디렉터리의 `wiki_auth.py` 가 담당한다.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

import wiki_auth


for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass


class WikiApiError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_write_conflict(self) -> bool:
        return "저장 충돌" in str(self)


def _json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)


def _print_json(data: Any) -> None:
    sys.stdout.write(json.dumps(data, ensure_ascii=False, indent=2))
    sys.stdout.write("\n")


def _parse_http_error(err: urllib.error.HTTPError) -> str:
    try:
        body = err.read().decode("utf-8", errors="replace")
    except Exception:
        body = ""
    if body:
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            msg = parsed.get("message") or parsed.get("error")
            if isinstance(msg, str) and msg:
                return msg
        return body.strip()
    return f"HTTP {err.code}"


def call_service(method: str, params: list[Any], token: str) -> Any:
    req = urllib.request.Request(
        f"{wiki_auth.API_BASE}/api/WikiService/{method}",
        data=_json_dumps(params).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "X-sd-client-name": wiki_auth.CLIENT_NAME,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        if err.code == 401:
            wiki_auth.clear_token()
            raise wiki_auth.WikiAuthExpired("위키 인증이 만료되었습니다.") from err
        message = _parse_http_error(err)
        raise WikiApiError(f"{method} 실패: {message}", err.code) from err
    except urllib.error.URLError as err:
        raise WikiApiError(f"{method} 실패: 위키 서버에 연결할 수 없습니다: {err.reason}") from err

    if body == "":
        return None
    try:
        return json.loads(body)
    except json.JSONDecodeError as err:
        raise WikiApiError(f"{method} 실패: 응답 JSON 을 해석할 수 없습니다.") from err


def _read_latest_version(topic: str, token: str) -> int | None:
    latest = call_service("read", [topic], token)
    if latest is None:
        return None
    if not isinstance(latest, dict) or not isinstance(latest.get("version"), int):
        raise WikiApiError("write 재시도 실패: 최신 페이지 응답에 version 이 없습니다.")
    return latest["version"]


def write_with_retry(input_data: dict[str, Any], token: str) -> Any:
    try:
        return call_service("write", [input_data], token)
    except WikiApiError as err:
        if not err.is_write_conflict:
            raise

    retry_input = dict(input_data)
    latest_version = _read_latest_version(str(input_data["topic"]), token)
    if latest_version is None:
        retry_input.pop("baseVersion", None)
    else:
        retry_input["baseVersion"] = latest_version
    return call_service("write", [retry_input], token)


def _read_body_arg(args: argparse.Namespace) -> str:
    if args.body is not None and args.body_file is not None:
        raise WikiApiError("--body 와 --body-file 은 함께 쓸 수 없습니다.")
    if args.body is not None:
        return args.body
    if args.body_file is not None:
        try:
            return Path(args.body_file).read_text(encoding="utf-8")
        except OSError as err:
            raise WikiApiError(f"본문 파일을 읽을 수 없습니다: {err}") from err
    if not sys.stdin.isatty():
        return sys.stdin.read()
    raise WikiApiError("본문은 --body, --body-file 또는 stdin 으로 입력해야 합니다.")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="원격 위키 CLI 래퍼")
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
    return parser


def _run_command(args: argparse.Namespace, token: str) -> Any:
    if args.command == "read":
        return call_service("read", [args.topic], token)
    if args.command == "search":
        return call_service("search", [args.keyword], token)
    if args.command == "toc":
        return call_service("toc", [], token)
    if args.command == "rootmap":
        return call_service("rootMap", [], token)
    if args.command == "children":
        return call_service("children", [args.topic], token)
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
        return write_with_retry(input_data, token)
    raise WikiApiError(f"알 수 없는 명령: {args.command}")


def _main(argv: list[str]) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    allow_browser = not args.no_browser

    try:
        token = wiki_auth.get_token(allow_browser=allow_browser)
        if token is None:
            return 1
        try:
            result = _run_command(args, token)
        except wiki_auth.WikiAuthExpired:
            if not allow_browser:
                raise
            token = wiki_auth.browser_login()
            result = _run_command(args, token)
    except wiki_auth.WikiAuthError as err:
        print(f"위키 인증 오류: {err}", file=sys.stderr)
        return 2
    except WikiApiError as err:
        print(f"위키 API 오류: {err}", file=sys.stderr)
        return 2

    _print_json(result)
    return 0


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))

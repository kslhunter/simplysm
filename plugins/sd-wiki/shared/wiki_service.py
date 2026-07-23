"""원격 위키 공유 코어 (플러그인 sd-wiki).

두 소비자 — 에이전트 CLI(`cli/wiki.py`)와 런타임 hook(`hooks/*`) — 가 공유하는
위키 접근 코어이자 모든 의존이 향하는 단일 싱크. 위→아래 6섹션으로 레이어가 드러남:
①결합상수 ②예외 ③토큰저장 ④인증 ⑤HTTP ⑥낙관락.

소비자는 이 모듈을 import 만 하고, 이 모듈은 소비자를 import 하지 않음(단방향 스타라
순환, import 순서의존이 원천 차단됨). 진입점은 소비자 쪽이며 여기엔 없음 —
stdout/stderr 인코딩 설정도 진입점 책임이라 이 모듈에서 건드리지 않음.

서버는 redirect_uri 의 hostname 을 localhost/127.0.0.1 로 제한(open redirect 차단)하므로
콜백은 127.0.0.1 고정. admin 화면은 해시 라우팅이라 redirect_uri, state 쿼리는 로그인
URL 의 해시(`#/login`) 뒤에 붙임.
"""

from __future__ import annotations

import base64
import contextlib
import json
import os
import re
import secrets
import subprocess
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

from shared.wiki_util import (
    decode_utf8_strict,
    default_data_dir,
    get_error_message,
)

# ── ① 결합상수 ────────────────────────────────────────────────────────
# 위키 서버 접속 주소 — 회사 단일 내부 서버라 상수 고정. dev, 로컬 테스트는 env 로 덮음.
LOGIN_URL = os.environ.get(
    "SD_WIKI_LOGIN_URL", "https://opus.simplysm.co.kr/client-admin/#/login"
)
API_BASE = re.sub(
    r"/+$", "", os.environ.get("SD_WIKI_API_URL", "https://opus.simplysm.co.kr")
)

# service-server 가 요구하는 클라이언트 식별 헤더 값(시스템 로그 clientName 으로 기록됨).
CLIENT_NAME = "sd-wiki"

# 직원이 브라우저에서 로그인하기까지 콜백을 기다리는 한도(초).
LOGIN_TIMEOUT_SEC = 300

REQUEST_TIMEOUT_SEC = 20


def data_dir() -> str:
    dir_path = default_data_dir()
    os.makedirs(dir_path, mode=0o700, exist_ok=True)
    # 토큰 보관 디렉터리 — 기존에 느슨하게 생성됐어도 소유자 전용으로 닫음(Windows 는 무시).
    with contextlib.suppress(OSError):
        os.chmod(dir_path, 0o700)
    return dir_path


def token_path() -> str:
    return os.path.join(data_dir(), "wiki-token.json")


# ── ② 예외 ────────────────────────────────────────────────────────────
class WikiAuthError(Exception):
    """위키 인증 실패(네트워크, 서버 오류 등). 호출부가 fail-open 여부를 결정."""


class WikiAuthExpired(WikiAuthError):
    """저장 토큰이 만료, 무효(refresh 401). 재로그인이 필요."""


class WikiApiError(Exception):
    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_write_conflict(self) -> bool:
        return "저장 충돌" in str(self)


class WikiWriteConflict(WikiApiError):
    """write 낙관락 충돌 — 읽은 뒤 다른 작업자가 페이지를 먼저 바꿈.

    머지 없는 자동 덮어쓰기 대신 최신 본문(`latest`)을 담아 raise — 호출부가
    변경을 최신본에 재통합해 다시 write 하도록 유도(남의 수정 유실 방지).
    """

    def __init__(self, message: str, latest: Any) -> None:
        super().__init__(message)
        self.latest = latest


# ── ③ 토큰 저장 ───────────────────────────────────────────────────────
def load_token() -> str | None:
    """저장된 토큰을 반환. 없거나 형식이 깨졌으면 None."""
    try:
        with open(token_path(), "rb") as handle:
            payload = handle.read()
    except OSError:
        return None

    try:
        data = json.loads(decode_utf8_strict(payload))
    except ValueError, UnicodeDecodeError:
        return None

    token = data.get("token") if isinstance(data, dict) else None
    return token if isinstance(token, str) and token else None


def save_token(token: str) -> None:
    target_path = token_path()
    temp_path = f"{target_path}.tmp"

    descriptor = os.open(temp_path, os.O_CREAT | os.O_WRONLY | os.O_TRUNC, 0o600)
    with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
        json.dump({"token": token}, handle)
    os.replace(temp_path, target_path)


def clear_token() -> None:
    with contextlib.suppress(FileNotFoundError):
        os.remove(token_path())


# ── ④ 인증 ────────────────────────────────────────────────────────────
def _post(url: str, body: str, token: str) -> tuple[int, str]:
    """POST 후 (상태코드, 본문). 4xx/5xx 도 예외 대신 상태코드로 돌려준다."""
    request = urllib.request.Request(  # noqa: S310
        url,
        data=body.encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "x-sd-client-name": CLIENT_NAME,
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SEC) as response:  # noqa: S310
            return response.status, decode_utf8_strict(response.read())
    except urllib.error.HTTPError as error:
        with contextlib.suppress(Exception):
            return error.code, decode_utf8_strict(error.read())
        return error.code, ""


def refresh_token(token: str) -> str:
    """유효 토큰을 슬라이딩 갱신해 새 토큰을 반환. 만료, 무효면 WikiAuthExpired."""
    try:
        status, body = _post(f"{API_BASE}/api/AuthService/refresh", "[]", token)
    except OSError as error:
        raise WikiAuthError(
            f"위키 서버에 연결할 수 없습니다: {get_error_message(error)}"
        ) from error

    if status == 401:
        raise WikiAuthExpired("토큰이 만료되었거나 유효하지 않습니다.")
    if status >= 400:
        raise WikiAuthError(f"refresh 실패: HTTP {status}")

    try:
        result = json.loads(body)
    except ValueError as error:
        raise WikiAuthError("refresh 응답을 해석할 수 없습니다.") from error

    new_token = result.get("token") if isinstance(result, dict) else None
    if not isinstance(new_token, str) or not new_token:
        raise WikiAuthError("refresh 응답에 토큰이 없습니다.")
    return new_token


def open_browser(login_url: str) -> None:
    try:
        if sys.platform == "win32":
            command = ["rundll32", "url.dll,FileProtocolHandler", login_url]
        elif sys.platform == "darwin":
            command = ["open", login_url]
        else:
            command = ["xdg-open", login_url]

        kwargs: dict = {
            "stdin": subprocess.DEVNULL,
            "stdout": subprocess.DEVNULL,
            "stderr": subprocess.DEVNULL,
        }
        if os.name == "nt":
            kwargs["creationflags"] = subprocess.DETACHED_PROCESS
        else:
            kwargs["start_new_session"] = True

        subprocess.Popen(command, **kwargs)  # noqa: S603
    except Exception:
        # 브라우저 자동 실행 실패(바이너리 부재 등)는 무시 — fallback URL 이 이미 출력됨.
        pass


def browser_login(timeout_sec: int = LOGIN_TIMEOUT_SEC) -> str:
    """단발 콜백 서버를 띄우고 브라우저로 로그인 → 토큰 수신, 저장 후 반환."""
    state = (
        base64.urlsafe_b64encode(secrets.token_bytes(12)).decode("ascii").rstrip("=")
    )
    received: dict[str, str] = {}
    done = threading.Event()

    class CallbackHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:  # noqa: N802
            query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
            token = (query.get("token") or [None])[0]
            callback_state = (query.get("state") or [None])[0]

            # 콜백이 아닌 부수 요청(favicon 등)이나 state 불일치(떠도는 로컬 요청, 위조)는 무시하고 계속 대기.
            # CSRF 방지: state 가 발급값과 일치할 때만 토큰을 받아들인다(검증 전 조기 종료 금지).
            if token is None or callback_state != state:
                self.send_response(404)
                self.send_header("Content-Length", "0")
                self.end_headers()
                return

            received["token"] = token
            body = (
                "<!doctype html><meta charset=utf-8><title>인증 완료</title>"
                "<body style='font-family:sans-serif;text-align:center;padding-top:60px'>"
                "<h2>위키 인증이 완료되었습니다.</h2><p>이 창을 닫아도 됩니다.</p></body>"
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            done.set()

        def log_message(self, *args: object) -> None:
            """액세스 로그를 지운다 — 훅 stdout 이 곧 컨텍스트라 오염되면 안 된다."""

    server = HTTPServer(("127.0.0.1", 0), CallbackHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    try:
        redirect_uri = f"http://127.0.0.1:{server.server_port}/"
        query = urllib.parse.urlencode({"redirect_uri": redirect_uri, "state": state})
        login_url = f"{LOGIN_URL}?{query}"

        open_browser(login_url)
        # 브라우저 자동 실행이 안 되는 환경(원격, SSH) 폴백: 주소 안내(stderr — stdout 오염 방지)
        print(f"[위키 인증] 브라우저에서 로그인하세요:\n  {login_url}", file=sys.stderr)

        done.wait(timeout_sec)
    finally:
        server.shutdown()
        server.server_close()

    token = received.get("token")
    if token is None:
        raise WikiAuthError("로그인 대기 시간이 초과되었습니다.")

    save_token(token)
    return token


def get_token(allow_browser: bool = True) -> str | None:
    """저장 토큰을 refresh 로 갱신해 반환.

    토큰이 없거나 만료(401)면 재로그인(allow_browser=True)하거나 None 을 반환.
    네트워크, 서버 오류는 WikiAuthError 로 전파(호출부가 fail-open 을 결정).
    """
    token = load_token()
    if token is not None:
        try:
            new_token = refresh_token(token)
            save_token(new_token)
            return new_token
        except WikiAuthExpired:
            clear_token()  # 만료 → 폐기 후 재로그인 경로로

    if allow_browser:
        return browser_login()
    return None


# ── ⑤ HTTP ────────────────────────────────────────────────────────────
def parse_http_error(status: int, body: str) -> str:
    if body:
        try:
            parsed = json.loads(body)
            if isinstance(parsed, dict):
                message = parsed.get("message") or parsed.get("error")
                if isinstance(message, str) and message:
                    return message
        except ValueError:
            # JSON 이 아니면 본문 전체를 메시지로 쓴다.
            pass
        return body.strip()
    return f"HTTP {status}"


def call_service(method: str, params: list, token: str) -> Any:
    try:
        status, body = _post(
            f"{API_BASE}/api/WikiService/{method}",
            json.dumps(params, ensure_ascii=False),
            token,
        )
    except OSError as error:
        raise WikiApiError(
            f"{method} 실패: 위키 서버에 연결할 수 없습니다: {get_error_message(error)}"
        ) from error

    if status == 401:
        clear_token()
        raise WikiAuthExpired("위키 인증이 만료되었습니다.")
    if status >= 400:
        raise WikiApiError(f"{method} 실패: {parse_http_error(status, body)}", status)

    if body == "":
        return None
    try:
        return json.loads(body)
    except ValueError as error:
        raise WikiApiError(
            f"{method} 실패: 응답 JSON 을 해석할 수 없습니다."
        ) from error


# ── ⑥ 낙관락 ──────────────────────────────────────────────────────────
# 충돌 시 에이전트에게 줄 안내 — 머지 없는 자동 덮어쓰기를 하지 않으므로,
# 최신 본문(latest)에 변경을 재통합해 --base-version 으로 다시 쓰도록 유도.
# ("저장 충돌" 단어를 피함 — is_write_conflict 의 서버 메시지 판별과 섞이지 않게.)
CONFLICT_GUIDE = (
    "쓰기 충돌: 읽은 뒤 다른 작업자가 페이지를 먼저 바꿨습니다. "
    "남의 수정을 덮어쓰지 않도록 자동 재시도하지 않습니다 — "
    "아래 latest(최신 제목, 요약, 본문)에 이번 변경을 재통합한 뒤 "
    "`--base-version <latest.version>` 으로 다시 write 하세요."
)


def write_page(input_data: dict, token: str) -> Any:
    """페이지 write. 낙관락 충돌이면 최신 본문을 담아 WikiWriteConflict 로 알림.

    머지 없는 자동 덮어쓰기를 하지 않음 — 충돌 해소는 호출부(에이전트)가
    최신본에 변경을 재통합하는 방식으로만 가능.
    """
    try:
        return call_service("write", [input_data], token)
    except WikiApiError as error:
        if not error.is_write_conflict:
            raise

    latest = call_service("read", [str(input_data.get("topic"))], token)
    raise WikiWriteConflict(CONFLICT_GUIDE, latest)

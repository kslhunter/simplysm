"""원격 위키 공유 코어 (플러그인 sd-wiki).

두 소비자 — 에이전트 CLI(`scripts/wiki.py`)와 런타임 hook(`hooks/*`) — 가 공유하는
opus `WikiService` 접근 코어이자 모든 의존이 향하는 단일 싱크. 위→아래 6섹션으로
레이어가 드러남: ①결합상수 ②예외 ③토큰저장 ④인증 ⑤HTTP ⑥낙관락.

소비자는 이 모듈을 import 만 하고, 이 모듈은 소비자를 import 하지 않음(단방향 스타라
순환·import 순서의존이 원천 차단됨). 진입점(`__main__`)은 소비자 쪽이며 여기엔 없음 —
stdout/stderr 인코딩 설정도 진입점 책임이라 이 모듈에서 건드리지 않음.

opus 는 redirect_uri 의 hostname 을 localhost/127.0.0.1 로 제한(open redirect 차단)하므로
콜백은 127.0.0.1 고정. opus admin 은 해시 라우팅이라 redirect_uri·state 쿼리는 로그인
URL 의 해시(`#/login`) 뒤에 붙임.
"""
from __future__ import annotations

import json
import os
import secrets
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlencode, urlparse


# ── ① 결합상수 ────────────────────────────────────────────────────────
# opus 위키 서버 접속 주소 — 회사 단일 내부 서버라 상수 고정. dev·로컬 테스트는 env 로 덮음.
LOGIN_URL = (
    os.environ.get("SD_WIKI_LOGIN_URL")
    or "https://opus.simplysm.co.kr/client-admin/#/login"
)
API_BASE = (os.environ.get("SD_WIKI_API_URL") or "https://opus.simplysm.co.kr").rstrip("/")

# service-server 가 요구하는 클라이언트 식별 헤더 값(시스템 로그 clientName 으로 기록됨).
CLIENT_NAME = "sd-wiki"

# 직원이 브라우저에서 로그인하기까지 콜백을 기다리는 한도(초).
LOGIN_TIMEOUT_SEC = 300


def _data_dir() -> Path:
    # 토큰 고정경로: 에이전트의 일반 Bash 셸엔 CLAUDE_PLUGIN_* env 가 주입되지 않으므로,
    # hook 과 CLI 가 같은 토큰을 보려면 env 비의존 고정경로여야 함.
    d = Path.home() / ".claude" / "sd"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _token_path() -> Path:
    return _data_dir() / "wiki-token.json"


# ── ② 예외 ────────────────────────────────────────────────────────────
class WikiAuthError(Exception):
    """위키 인증 실패(네트워크·서버 오류 등). 호출부가 fail-open 여부를 결정."""


class WikiAuthExpired(WikiAuthError):
    """저장 토큰이 만료·무효(refresh 401). 재로그인이 필요."""


class WikiApiError(Exception):
    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code

    @property
    def is_write_conflict(self) -> bool:
        return "저장 충돌" in str(self)


# ── ③ 토큰 저장 ───────────────────────────────────────────────────────
def load_token() -> str | None:
    """저장된 토큰을 반환. 없거나 형식이 깨졌으면 None."""
    p = _token_path()
    if not p.is_file():
        return None
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    tok = data.get("token") if isinstance(data, dict) else None
    return tok if isinstance(tok, str) and tok else None


def save_token(token: str) -> None:
    p = _token_path()
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps({"token": token}, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, p)


def clear_token() -> None:
    try:
        _token_path().unlink()
    except FileNotFoundError:
        # 이미 없음 = 폐기 목적 달성.
        pass


# ── ④ 인증 ────────────────────────────────────────────────────────────
def refresh_token(token: str) -> str:
    """유효 토큰을 슬라이딩 갱신해 새 토큰을 반환. 만료·무효면 WikiAuthExpired."""
    req = urllib.request.Request(
        f"{API_BASE}/api/AuthService/refresh",
        data=b"[]",  # refresh 는 인자 없음 → 빈 파라미터 배열
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "x-sd-client-name": CLIENT_NAME,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        if err.code == 401:
            raise WikiAuthExpired("토큰이 만료되었거나 유효하지 않습니다.") from err
        raise WikiAuthError(f"refresh 실패: HTTP {err.code}") from err
    except urllib.error.URLError as err:
        raise WikiAuthError(f"위키 서버에 연결할 수 없습니다: {err.reason}") from err

    result = json.loads(body)  # IAuthResult — 표준 JSON(커스텀 타입 없음)
    new_token = result.get("token") if isinstance(result, dict) else None
    if not isinstance(new_token, str) or not new_token:
        raise WikiAuthError("refresh 응답에 토큰이 없습니다.")
    return new_token


class _CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        qs = parse_qs(urlparse(self.path).query)
        token = (qs.get("token") or [None])[0]
        state = (qs.get("state") or [None])[0]
        if token is None or state is None:
            # 콜백이 아닌 부수 요청(favicon 등) — 무시하고 계속 대기
            self.send_response(404)
            self.end_headers()
            return
        self.server.auth_token = token  # type: ignore[attr-defined]
        self.server.auth_state = state  # type: ignore[attr-defined]
        body = (
            "<!doctype html><meta charset=utf-8><title>인증 완료</title>"
            "<body style='font-family:sans-serif;text-align:center;padding-top:60px'>"
            "<h2>위키 인증이 완료되었습니다.</h2><p>이 창을 닫아도 됩니다.</p></body>"
        ).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):  # 진단 로그 억제(stdout/stderr 오염 방지)
        pass


def browser_login(timeout_sec: int = LOGIN_TIMEOUT_SEC) -> str:
    """단발 콜백 서버를 띄우고 브라우저로 로그인 → 토큰 수신·저장 후 반환."""
    state = secrets.token_urlsafe(16)

    server = HTTPServer(("127.0.0.1", 0), _CallbackHandler)
    server.auth_token = None  # type: ignore[attr-defined]
    server.auth_state = None  # type: ignore[attr-defined]
    server.timeout = 1  # handle_request 폴링 간격(초)

    port = server.server_address[1]
    redirect_uri = f"http://127.0.0.1:{port}/"
    login_url = f"{LOGIN_URL}?{urlencode({'redirect_uri': redirect_uri, 'state': state})}"

    try:
        webbrowser.open(login_url)
    except Exception:
        pass
    # 브라우저 자동 실행이 안 되는 환경(원격·SSH) 폴백: 주소 안내(stderr — stdout 오염 방지)
    print(f"[위키 인증] 브라우저에서 로그인하세요:\n  {login_url}", file=sys.stderr)

    deadline = time.monotonic() + timeout_sec
    try:
        while server.auth_token is None:  # type: ignore[attr-defined]
            if time.monotonic() > deadline:
                raise WikiAuthError("로그인 대기 시간이 초과되었습니다.")
            server.handle_request()
    finally:
        server.server_close()

    # CSRF 방지: 콜백 state 가 우리가 발급한 값과 일치해야 한다.
    if server.auth_state != state:  # type: ignore[attr-defined]
        raise WikiAuthError("콜백 state 가 일치하지 않습니다. (요청 위조 가능성)")

    token = server.auth_token  # type: ignore[attr-defined]
    save_token(token)
    return token


def get_token(allow_browser: bool = True) -> str | None:
    """저장 토큰을 refresh 로 갱신해 반환.

    토큰이 없거나 만료(401)면 재로그인(allow_browser=True)하거나 None 을 반환.
    네트워크·서버 오류는 WikiAuthError 로 전파(호출부가 fail-open 을 결정).
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
def _json_dumps(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False)


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
        f"{API_BASE}/api/WikiService/{method}",
        data=_json_dumps(params).encode("utf-8"),
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "X-sd-client-name": CLIENT_NAME,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
    except urllib.error.HTTPError as err:
        if err.code == 401:
            clear_token()
            raise WikiAuthExpired("위키 인증이 만료되었습니다.") from err
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


# ── ⑥ 낙관락 ──────────────────────────────────────────────────────────
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

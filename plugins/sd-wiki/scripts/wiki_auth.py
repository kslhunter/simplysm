"""위키 접근 인증 (플러그인 sd-wiki).

opus(client/server)가 제공하는 브라우저 authorization-code 인증을 받아 플러그인
측에서 토큰을 보관·갱신하는 모듈.

흐름:
  1. browser_login(): 127.0.0.1 단발 콜백 서버를 띄우고 opus 로그인 페이지를
     브라우저로 연다. 직원이 로그인하면 opus 가 콜백으로 토큰을 전달(redirect_uri
     쿼리). state 를 왕복 검증해 토큰을 받아 저장.
  2. refresh_token(): 유효 토큰을 `POST /api/AuthService/refresh` 로 슬라이딩 갱신.
  3. get_token(): 저장 토큰을 refresh 로 갱신해 반환. 토큰이 없거나 만료(401)면
     브라우저 로그인으로 재발급(allow_browser=True)하거나 None 반환.

저장: ${CLAUDE_PLUGIN_DATA}/wiki-token.json — 토큰만 보관(비밀번호는 브라우저에만).
opus 는 redirect_uri 의 hostname 을 localhost/127.0.0.1 로 제한(open redirect 차단)하므로
콜백은 127.0.0.1 고정. opus admin 은 해시 라우팅이라 redirect_uri·state 쿼리는
로그인 URL 의 해시(`#/login`) 뒤에 붙인다.

7(위키 CLI 래퍼)·8(session-start 원격 전환)이 이 모듈을 import 한다.
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
from urllib.parse import parse_qs, urlencode, urlparse

# Windows 콘솔(cp949) 에서 안내 메시지가 깨지지 않도록 UTF-8 로 통일.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8")
    except Exception:
        pass

# opus 위키 서버 접속 주소 — 회사 단일 내부 서버라 상수 고정.
# dev·로컬 테스트는 환경변수로 덮는다.
LOGIN_URL = (
    os.environ.get("SD_WIKI_LOGIN_URL")
    or "https://opus.simplysm.co.kr/client-admin/#/login"
)
API_BASE = (os.environ.get("SD_WIKI_API_URL") or "https://opus.simplysm.co.kr").rstrip("/")

# service-server 가 요구하는 클라이언트 식별 헤더 값(시스템 로그 clientName 으로 기록됨).
CLIENT_NAME = "sd-wiki"

# 직원이 브라우저에서 로그인하기까지 콜백을 기다리는 한도(초).
LOGIN_TIMEOUT_SEC = 300


class WikiAuthError(Exception):
    """위키 인증 실패(네트워크·서버 오류 등). 호출부가 fail-open 여부를 결정한다."""


class WikiAuthExpired(WikiAuthError):
    """저장 토큰이 만료·무효(refresh 401). 재로그인이 필요하다."""


def _data_dir() -> Path:
    base = os.environ.get("CLAUDE_PLUGIN_DATA") or os.environ.get("PLUGIN_DATA")
    if not base:
        raise WikiAuthError("CLAUDE_PLUGIN_DATA 환경변수가 없습니다.")
    d = Path(base)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _token_path() -> Path:
    return _data_dir() / "wiki-token.json"


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
        # 이미 없음 = 폐기 목적 달성. 단 _data_dir() 의 WikiAuthError(토큰 위치 결정 불가)는
        # 폐기 실패이므로 삼키지 않고 전파.
        pass


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


def _main(argv: list[str]) -> int:
    cmd = argv[0] if argv else "token"
    if cmd == "login":
        browser_login()
        print("위키 인증 완료.", file=sys.stderr)
        return 0
    if cmd == "token":
        # 비차단: 브라우저를 띄우지 않고 유효 토큰만 stdout 으로(없으면 종료코드 1).
        try:
            token = get_token(allow_browser=False)
        except WikiAuthError as err:
            print(f"위키 인증 오류: {err}", file=sys.stderr)
            return 2
        if token is None:
            return 1
        sys.stdout.write(token)
        return 0
    if cmd == "logout":
        clear_token()
        return 0
    print(f"알 수 없는 명령: {cmd} (login|token|logout)", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(_main(sys.argv[1:]))

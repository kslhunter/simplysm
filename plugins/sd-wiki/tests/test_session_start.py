from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import textwrap
import time
import unittest
from pathlib import Path


HOOK_PATH = Path(__file__).resolve().parents[1] / "hooks" / "session-start.py"


class SessionStartHookTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base_dir = Path(self.tmp.name)
        self.plugin_root = self.base_dir / "plugin"
        self.plugin_data = self.base_dir / "data"
        self.project_dir = self.base_dir / "project"
        (self.plugin_root / "scripts").mkdir(parents=True)
        (self.plugin_root / "rules").mkdir()
        self.plugin_data.mkdir()
        self.project_dir.mkdir()

    def tearDown(self):
        # 백그라운드 로그인 worker subprocess 가 plugin_data 의 로그 파일 핸들을 쥔 채
        # 종료되기 전이면 Windows 에서 디렉터리 삭제가 잠김(WinError 32). worker 가
        # 종료될 때까지 짧게 재시도해 임시파일 잔류 없이 정리.
        deadline = time.monotonic() + 5
        while True:
            try:
                self.tmp.cleanup()
                return
            except OSError:
                if time.monotonic() > deadline:
                    raise
                time.sleep(0.05)

    def _write_script(self, file_name: str, body: str) -> None:
        (self.plugin_root / "scripts" / file_name).write_text(
            textwrap.dedent(body).lstrip(),
            encoding="utf-8",
        )

    def _run_hook(self, extra_env: dict[str, str] | None = None) -> subprocess.CompletedProcess[str]:
        env = os.environ.copy()
        env.update(
            {
                "CLAUDE_PLUGIN_ROOT": str(self.plugin_root),
                "CLAUDE_PLUGIN_DATA": str(self.plugin_data),
                "CLAUDE_PROJECT_DIR": str(self.project_dir),
                "PYTHONIOENCODING": "utf-8",
            }
        )
        if extra_env:
            env.update(extra_env)

        return subprocess.run(
            [sys.executable, str(HOOK_PATH), "--part", "0"],
            input=json.dumps({"cwd": str(self.project_dir), "session_id": "session-1"}),
            text=True,
            encoding="utf-8",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            timeout=10,
            check=False,
        )

    def test_remote_toc_is_injected_when_token_is_valid(self):
        self._write_script(
            "wiki_auth.py",
            """
            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                assert allow_browser is False
                return "token-1"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                assert method == "toc"
                assert params == []
                assert token == "token-1"
                return [
                    {
                        "topic": "codex-cli-plugin-hooks.md",
                        "title": "Codex CLI 플러그인·훅",
                        "summary": "Codex 훅 구조를 볼 때.",
                    },
                    {
                        "topic": "empty-summary.md",
                        "title": "빈 요약",
                        "summary": "",
                    },
                ]
            """,
        )

        result = self._run_hook()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("## 개인 지식 위키 목차 (원격)", result.stdout)
        self.assertIn(
            "- [Codex CLI 플러그인·훅](codex-cli-plugin-hooks.md) — Codex 훅 구조를 볼 때.",
            result.stdout,
        )
        self.assertIn("- [빈 요약](empty-summary.md)", result.stdout)
        self.assertNotIn(".claude/wiki/index.md", result.stdout)

    def test_invalid_remote_toc_is_fail_open_without_injection(self):
        self._write_script(
            "wiki_auth.py",
            """
            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                return "token-1"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                return [{"topic": "a.md", "summary": "missing title"}]
            """,
        )

        result = self._run_hook()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("개인 지식 위키 목차", result.stdout)

    def test_auth_error_is_fail_open_without_injection(self):
        self._write_script(
            "wiki_auth.py",
            """
            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                raise WikiAuthError("server unavailable")
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                raise AssertionError("toc must not be called after auth error")
            """,
        )

        result = self._run_hook()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("개인 지식 위키 목차", result.stdout)

    def test_toc_error_is_fail_open_without_injection(self):
        self._write_script(
            "wiki_auth.py",
            """
            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                return "token-1"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                raise RuntimeError("server unavailable")
            """,
        )

        result = self._run_hook()

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("개인 지식 위키 목차", result.stdout)

    def test_missing_token_starts_one_nonblocking_login(self):
        counter_path = self.base_dir / "login-count.txt"
        self._write_script(
            "wiki_auth.py",
            """
            import os
            import time
            from pathlib import Path

            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                assert allow_browser is False
                return None

            def browser_login():
                path = Path(os.environ["LOGIN_COUNTER_PATH"])
                current = int(path.read_text(encoding="utf-8")) if path.is_file() else 0
                path.write_text(str(current + 1), encoding="utf-8")
                time.sleep(1)
                return "token-2"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                raise AssertionError("toc must not be called without a token")
            """,
        )

        env = {"LOGIN_COUNTER_PATH": str(counter_path)}
        first = self._run_hook(env)
        second = self._run_hook(env)

        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertNotIn("개인 지식 위키 목차", first.stdout)
        self.assertNotIn("개인 지식 위키 목차", second.stdout)

        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if counter_path.is_file():
                break
            time.sleep(0.05)

        self.assertTrue(counter_path.is_file(), "background login did not start")
        self.assertEqual(counter_path.read_text(encoding="utf-8"), "1")

        lock_path = self.plugin_data / "wiki-login.lock"
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if not lock_path.exists():
                break
            time.sleep(0.05)

    def test_expired_token_starts_one_nonblocking_login(self):
        counter_path = self.base_dir / "login-count.txt"
        self._write_script(
            "wiki_auth.py",
            """
            import os
            from pathlib import Path

            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                assert allow_browser is False
                raise WikiAuthExpired("expired")

            def browser_login():
                path = Path(os.environ["LOGIN_COUNTER_PATH"])
                path.write_text("1", encoding="utf-8")
                return "token-2"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                raise AssertionError("toc must not be called after expired token")
            """,
        )

        result = self._run_hook({"LOGIN_COUNTER_PATH": str(counter_path)})

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("개인 지식 위키 목차", result.stdout)

        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if counter_path.is_file():
                break
            time.sleep(0.05)

        self.assertTrue(counter_path.is_file(), "background login did not start")
        self.assertEqual(counter_path.read_text(encoding="utf-8"), "1")

        lock_path = self.plugin_data / "wiki-login.lock"
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if not lock_path.exists():
                break
            time.sleep(0.05)

    def test_existing_login_lock_prevents_new_login_even_when_old(self):
        counter_path = self.base_dir / "login-count.txt"
        lock_path = self.plugin_data / "wiki-login.lock"
        lock_path.write_text(json.dumps({"startedAt": 1}), encoding="utf-8")
        self._write_script(
            "wiki_auth.py",
            """
            import os
            from pathlib import Path

            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                return None

            def browser_login():
                path = Path(os.environ["LOGIN_COUNTER_PATH"])
                path.write_text("1", encoding="utf-8")
                return "token-2"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            def call_service(method, params, token):
                raise AssertionError("toc must not be called without a token")
            """,
        )

        result = self._run_hook({"LOGIN_COUNTER_PATH": str(counter_path)})

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("개인 지식 위키 목차", result.stdout)
        self.assertFalse(counter_path.exists())
        self.assertTrue(lock_path.exists())

    def test_missing_token_keeps_current_session_without_wiki_after_login_finishes(self):
        token_calls_path = self.base_dir / "token-calls.txt"
        toc_called_path = self.base_dir / "toc-called.txt"
        self._write_script(
            "wiki_auth.py",
            """
            import os
            from pathlib import Path

            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                path = Path(os.environ["TOKEN_CALLS_PATH"])
                current = int(path.read_text(encoding="utf-8")) if path.is_file() else 0
                path.write_text(str(current + 1), encoding="utf-8")
                if current == 0:
                    return None
                return "token-after-login"

            def browser_login():
                return "token-after-login"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            import os
            from pathlib import Path

            def call_service(method, params, token):
                Path(os.environ["TOC_CALLED_PATH"]).write_text("called", encoding="utf-8")
                return [{"topic": "a.md", "title": "A", "summary": "S"}]
            """,
        )

        env = {
            "TOKEN_CALLS_PATH": str(token_calls_path),
            "TOC_CALLED_PATH": str(toc_called_path),
        }
        first = self._run_hook(env)
        self.assertEqual(first.returncode, 0, first.stderr)

        lock_path = self.plugin_data / "wiki-login.lock"
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            if not lock_path.exists():
                break
            time.sleep(0.05)

        second = self._run_hook(env)

        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertNotIn("개인 지식 위키 목차", second.stdout)
        self.assertEqual(token_calls_path.read_text(encoding="utf-8"), "1")
        self.assertFalse(toc_called_path.exists())

    def test_session_without_wiki_does_not_expire_within_same_session(self):
        token_calls_path = self.base_dir / "token-calls.txt"
        toc_called_path = self.base_dir / "toc-called.txt"
        session_skip_path = self.plugin_data / "wiki-session-no-context-session-1.lock"
        session_skip_path.write_text("1", encoding="utf-8")
        self._write_script(
            "wiki_auth.py",
            """
            import os
            from pathlib import Path

            class WikiAuthError(Exception):
                pass

            class WikiAuthExpired(WikiAuthError):
                pass

            def get_token(allow_browser=True):
                Path(os.environ["TOKEN_CALLS_PATH"]).write_text("called", encoding="utf-8")
                return "token-1"

            def browser_login():
                return "token-1"
            """,
        )
        self._write_script(
            "wiki.py",
            """
            import os
            from pathlib import Path

            def call_service(method, params, token):
                Path(os.environ["TOC_CALLED_PATH"]).write_text("called", encoding="utf-8")
                return [{"topic": "a.md", "title": "A", "summary": "S"}]
            """,
        )

        result = self._run_hook(
            {
                "TOKEN_CALLS_PATH": str(token_calls_path),
                "TOC_CALLED_PATH": str(toc_called_path),
            }
        )

        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn("개인 지식 위키 목차", result.stdout)
        self.assertFalse(token_calls_path.exists())
        self.assertFalse(toc_called_path.exists())

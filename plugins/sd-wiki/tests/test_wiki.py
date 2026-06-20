from __future__ import annotations

import contextlib
import io
import json
import sys
import unittest
import urllib.error
from pathlib import Path
from unittest import mock


SCRIPTS_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS_DIR))

import wiki_auth  # noqa: E402


class _FakeResponse:
    def __init__(self, data):
        self._body = json.dumps(data, ensure_ascii=False).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self._body


class WikiCliTest(unittest.TestCase):
    def setUp(self):
        sys.modules.pop("wiki", None)
        self.urlopen_calls = []

    def _import_wiki(self):
        import wiki

        return wiki

    def _run_cli(self, argv, responses):
        wiki = self._import_wiki()

        response_iter = iter(responses)

        def fake_urlopen(req, timeout):
            self.urlopen_calls.append((req, timeout, req.data))
            response = next(response_iter)
            if isinstance(response, BaseException):
                raise response
            return _FakeResponse(response)

        with (
            mock.patch.object(wiki_auth, "API_BASE", "https://wiki.example"),
            mock.patch.object(wiki_auth, "get_token", return_value="token-1") as get_token,
            mock.patch.object(wiki.urllib.request, "urlopen", side_effect=fake_urlopen),
            contextlib.redirect_stdout(io.StringIO()) as stdout,
        ):
            code = wiki._main(argv)

        return code, stdout.getvalue(), get_token

    def test_read_posts_topic_parameter_array(self):
        code, stdout, get_token = self._run_cli(
            ["--no-browser", "read", "topic-a"],
            [{"topic": "topic-a", "title": "A", "summary": "S", "body": "B", "version": 1}],
        )

        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), {"topic": "topic-a", "title": "A", "summary": "S", "body": "B", "version": 1})
        self.assertEqual(get_token.call_args.kwargs, {"allow_browser": False})

        req, timeout, body = self.urlopen_calls[0]
        self.assertEqual(req.full_url, "https://wiki.example/api/WikiService/read")
        self.assertEqual(timeout, 20)
        self.assertEqual(json.loads(body.decode("utf-8")), ["topic-a"])
        self.assertEqual(req.get_header("Authorization"), "Bearer token-1")
        self.assertEqual(req.get_header("X-sd-client-name"), "sd-wiki")

    def test_toc_and_search_post_expected_parameters(self):
        code, stdout, _ = self._run_cli(
            ["toc"],
            [[{"topic": "a", "title": "A", "summary": "S"}]],
        )
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), [{"topic": "a", "title": "A", "summary": "S"}])
        self.assertEqual(json.loads(self.urlopen_calls[0][2].decode("utf-8")), [])
        self.assertEqual(self.urlopen_calls[0][0].full_url, "https://wiki.example/api/WikiService/toc")

        self.urlopen_calls.clear()
        code, stdout, _ = self._run_cli(
            ["search", "keyword"],
            [[{"topic": "b", "title": "B", "summary": "S"}]],
        )
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), [{"topic": "b", "title": "B", "summary": "S"}])
        self.assertEqual(json.loads(self.urlopen_calls[0][2].decode("utf-8")), ["keyword"])
        self.assertEqual(self.urlopen_calls[0][0].full_url, "https://wiki.example/api/WikiService/search")

    def test_write_retries_after_conflict_with_latest_version(self):
        conflict_body = io.BytesIO(
            json.dumps({"message": "저장 충돌: 읽은 이후 다른 기록이 있었습니다."}, ensure_ascii=False).encode("utf-8")
        )
        conflict = urllib.error.HTTPError(
            "https://wiki.example/api/WikiService/write",
            500,
            "Internal Server Error",
            {},
            conflict_body,
        )
        code, stdout, _ = self._run_cli(
            [
                "write",
                "topic-a",
                "--title",
                "A",
                "--summary",
                "S",
                "--body",
                "new body",
                "--base-version",
                "3",
            ],
            [
                conflict,
                {"topic": "topic-a", "title": "A", "summary": "S", "body": "old", "version": 7},
                {"version": 8},
            ],
        )

        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), {"version": 8})
        self.assertEqual([call[0].full_url for call in self.urlopen_calls], [
            "https://wiki.example/api/WikiService/write",
            "https://wiki.example/api/WikiService/read",
            "https://wiki.example/api/WikiService/write",
        ])
        first_write = json.loads(self.urlopen_calls[0][2].decode("utf-8"))[0]
        second_write = json.loads(self.urlopen_calls[2][2].decode("utf-8"))[0]
        self.assertEqual(first_write["baseVersion"], 3)
        self.assertEqual(second_write["baseVersion"], 7)
        self.assertEqual(second_write["body"], "new body")


if __name__ == "__main__":
    unittest.main()

"""파일 내용, 경로 해시 유틸.

Write 대상이 Read 이후 바뀌었는지 판별한다.
경로 해시는 "기록하는 쪽과 읽는 쪽이 같은 값을 낸다"가 유일한 요구사항이다.
"""

from __future__ import annotations

import hashlib
import os


def hash_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def hash_text(content: str) -> str:
    return hash_bytes(content.encode("utf-8"))


def path_hash(file_path: str | os.PathLike[str]) -> str:
    return hash_text(os.path.normpath(os.fspath(file_path)))


def file_hash(file_path: str | os.PathLike[str]) -> str:
    with open(file_path, "rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def is_regular_file(file_path: str | os.PathLike[str]) -> bool:
    return os.path.isfile(file_path)


def file_exists(file_path: str | os.PathLike[str]) -> bool:
    return os.path.exists(file_path)

"""HTML → PDF 변환 (설치된 Chrome/Edge 의 headless print-to-pdf).

sd-estimate(견적서), sd-proposal(제안서) 공용. 브라우저 인쇄와 동일한 엔진으로
HTML 의 @page, print CSS(여백, 페이지 크기, 배경 음영)를 그대로 PDF 에 반영한다.

사용: python html_to_pdf.py <입력.html> <출력.pdf>
의존: 설치된 Chrome 또는 Edge (별도 다운로드 불필요). CHROME_PATH 로 경로 지정 가능.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def find_browser() -> str:
    """설치된 Chromium 계열(Chrome, Edge) 실행 파일 경로. 못 찾으면 throw."""
    env = os.environ.get("CHROME_PATH")
    if env and Path(env).exists():
        return env

    candidates: list[str] = []
    if sys.platform == "win32":
        pf = os.environ.get("PROGRAMFILES", r"C:\Program Files")
        pfx86 = os.environ.get("PROGRAMFILES(X86)", r"C:\Program Files (x86)")
        local = os.environ.get("LOCALAPPDATA", "")
        candidates += [
            rf"{pf}\Google\Chrome\Application\chrome.exe",
            rf"{pfx86}\Google\Chrome\Application\chrome.exe",
            rf"{local}\Google\Chrome\Application\chrome.exe",
            rf"{pf}\Microsoft\Edge\Application\msedge.exe",
            rf"{pfx86}\Microsoft\Edge\Application\msedge.exe",
        ]
    elif sys.platform == "darwin":
        candidates += [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
        ]
    else:
        for name in (
            "google-chrome",
            "google-chrome-stable",
            "chromium",
            "chromium-browser",
            "microsoft-edge",
        ):
            found = shutil.which(name)
            if found:
                candidates.append(found)

    for c in candidates:
        if c and Path(c).exists():
            return c
    raise RuntimeError(
        "Chrome/Edge 실행 파일을 찾지 못했습니다. CHROME_PATH 환경변수로 경로를 지정하세요."
    )


def html_to_pdf(html_path: Path, pdf_path: Path) -> Path:
    """HTML 파일을 PDF 로 변환. 실패 시 throw."""
    html_path = Path(html_path).resolve()
    pdf_path = Path(pdf_path).resolve()
    if not html_path.exists():
        raise FileNotFoundError(f"입력 HTML 없음: {html_path}")
    pdf_path.parent.mkdir(parents=True, exist_ok=True)

    browser = find_browser()
    url = "file:///" + str(html_path).replace("\\", "/")
    # 기본 프로파일 잠금 충돌을 피하려 일회용 user-data-dir 사용
    profile = Path(tempfile.mkdtemp(prefix="html2pdf-"))
    try:
        proc = subprocess.run(
            [
                browser,
                "--headless=new",
                "--disable-gpu",
                "--no-pdf-header-footer",
                f"--user-data-dir={profile}",
                f"--print-to-pdf={pdf_path}",
                url,
            ],
            capture_output=True,
            text=True,
        )
        if proc.returncode != 0 or not pdf_path.exists():
            raise RuntimeError(
                f"PDF 생성 실패 (exit {proc.returncode}): {proc.stderr.strip()}"
            )
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    return pdf_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("사용: python html_to_pdf.py <입력.html> <출력.pdf>", file=sys.stderr)
        sys.exit(2)
    out = html_to_pdf(Path(sys.argv[1]), Path(sys.argv[2]))
    print(f"PDF 생성: {out}")

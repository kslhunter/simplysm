"""견적서 PDF 의 페이지별 '텅 빔'(첫·중간 페이지의 과다 하단 여백)을 점검·경고한다.

원리: page-break-inside:avoid 블록(거래조건·전제·부록 section 등)이 현재 페이지의
      남은 높이에 못 들어가면 통째로 다음 페이지로 밀리고, 그 페이지 하단이 크게 빈다.
      견적서 HTML 을 실제 PDF 로 출력(브라우저 인쇄와 동일 엔진)한 뒤 페이지별로
      콘텐츠 맨 아래를 측정해 빈 비율이 임계 이상이면 경고한다.

사용: python check-page-fill.py <견적서.html 경로> [임계비율(기본 0.35)]
의존: PyMuPDF(fitz) + 설치된 Chrome/Edge. PDF 생성은 ../../../shared/python/html_to_pdf.py 공용.
"""
from __future__ import annotations

import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / "shared" / "python"))
from html_to_pdf import html_to_pdf  # noqa: E402

import fitz  # noqa: E402  (PyMuPDF)

MM = 2.834645669   # 1mm in PDF points (72dpi)
RUN_TOP_MM = 16    # 템플릿 상단 여백 spacer(.run-top, @media print)
RUN_BOT_MM = 14    # 템플릿 하단 여백 spacer(.run-bot) — 정상 여백이라 빈 공간에서 제외


def _content_bottom(page) -> float:
    """페이지에서 실제 콘텐츠가 끝나는 y(pt). 페이지 전체를 덮는 배경 drawing 은 제외."""
    H, W = page.rect.height, page.rect.width
    bottoms = [b[3] for b in page.get_text("blocks")]
    for d in page.get_drawings():
        r = d["rect"]
        if (r[2] - r[0]) > W * 0.95 and (r[3] - r[1]) > H * 0.5:
            continue  # 전체폭·반페이지↑ = 시트 배경(흰 fill 등) → 콘텐츠 아님
        bottoms.append(r[3])
    return max(bottoms, default=0.0)


def _first_text_label(page) -> str:
    """다음 페이지로 밀린(이 페이지 하단을 비운) 블록 추정 — 다음 페이지 첫 텍스트."""
    for b in page.get_text("blocks"):
        text = b[4].strip().replace("\n", " ") if len(b) > 4 else ""
        if text:
            return text[:30]
    return ""


def main() -> int:
    if len(sys.argv) < 2:
        print("사용: python check-page-fill.py <견적서.html 경로> [임계비율(기본 0.35)]",
              file=sys.stderr)
        return 2
    html_path = Path(sys.argv[1])
    threshold = float(sys.argv[2]) if len(sys.argv) > 2 else 0.35

    with tempfile.TemporaryDirectory(prefix="checkfill-") as tmp:
        pdf_path = Path(tmp) / "estimate.pdf"
        html_to_pdf(html_path, pdf_path)
        with fitz.open(pdf_path) as doc:
            n = doc.page_count
            warnings: list[tuple[int, int, str]] = []
            for i, page in enumerate(doc):
                if i == n - 1:
                    continue  # 마지막 페이지는 비는 게 정상 — 제외
                H = page.rect.height
                cb = _content_bottom(page)
                # 콘텐츠 영역(상·하 여백 제외) 대비 하단 빈 공간 비율
                content_area = H - (RUN_TOP_MM + RUN_BOT_MM) * MM
                empty_pt = (H - RUN_BOT_MM * MM) - cb
                empty = max(0.0, empty_pt / content_area)
                if empty >= threshold:
                    warnings.append((i + 1, round(empty * 100), _first_text_label(doc[i + 1])))

    print(f"총 {n}쪽 | 임계 {round(threshold * 100)}%")
    if not warnings:
        print("OK — 텅 빈 페이지 없음.")
        return 0
    print("[경고] 텅 빔:")
    for pg, pct, nxt in warnings:
        tail = f" — 다음 블록이 통째로 밀림: {nxt}" if nxt else ""
        print(f"  - {pg}쪽 하단 {pct}% 빔{tail}")
    print("→ 표 셀 padding·폰트를 축소해 압축하거나, 밀린 섹션의 page-break-inside 를 조정.")
    return 1


if __name__ == "__main__":
    sys.exit(main())

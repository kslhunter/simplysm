---
name: sd-html-to-pdf
description: HTML 파일을 브라우저 인쇄와 동일한 엔진으로 PDF 출력. Use when 견적서, 제안서 등 @page, print CSS 로 조판한 HTML 을 PDF 로 내보낼 때.
model: sonnet[1m]
effort: low
---

설치된 Chrome/Edge 의 headless print-to-pdf 로 변환합니다. `@page`, print CSS(여백, 페이지 크기, 배경 음영)가 그대로 반영됩니다.

```
python "${CLAUDE_SKILL_DIR}/scripts/html_to_pdf.py" <입력.html> <출력.pdf>
```

- 경로는 절대경로로 넘기세요.
- Chrome/Edge 를 못 찾으면 실패합니다. `CHROME_PATH` 환경변수로 지정할 수 있습니다.
- 생성된 PDF 경로를 출력하세요.

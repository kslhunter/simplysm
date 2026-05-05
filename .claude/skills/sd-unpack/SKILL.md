---
name: sd-unpack
description: 문서를 첨부 포함 깊숙히 해체해 평문/이미지/원본 트리로 펼치는 스킬. eml/msg/pdf/docx/pptx/xlsx/xlsb 와 레거시 doc/ppt/xls 를 지원하며, 컨테이너 안 첨부도 재귀적으로 풀어 Claude 에이전트가 README.md 한 번 Read 로 진입할 수 있게 만든다. Use when 분석에 앞서 문서 안 첨부까지 모두 풀어 평문·이미지로 만들어 둬야 할 때

---

# sd-unpack

## 호출

```
python .claude/skills/sd-unpack/scripts/unpack.py <입력파일 절대경로>
```

스크립트가 형식 분기·재귀 풀이·README 생성까지 알아서 처리한다. stdout 으로 결과 폴더 절대경로가 출력된다.

여러 파일을 풀어달라는 요청이 오면 단일 파일 단위로 반복 호출한다.

## 결과 폴더

입력 파일 옆에 `<basename>_<ext>/` 가 생긴다. 컨테이너 첨부는 같은 패턴으로 재귀적으로 풀린다. 폴더 안 `_source.<ext>` + `README.md` 가 풀린 폴더의 식별 마커.

시각은 PNG, 텍스트/구조는 MD/JSON 으로 분리해 출력한다.

```
meeting_eml/
  README.md            ← 진입점. 본문 요약·헤더·첨부 목록·손실 영역
  _source.eml          ← 원본
  body.md              ← 본문 (있으면)
  body.html
  headers.json
  attachments/
    report_pptx/             ← 컨테이너 첨부는 재귀 풀이
      README.md
      _source.pptx
      slides/
        01_표지.png          ← 슬라이드 통째 렌더링
        01_표지.md           ← 슬라이드 텍스트
        01_표지.notes.md     ← 노트 (있을 때만)
      charts/
        chart_001.data.json  ← 차트 raw 데이터
      attachments/
        embedded_xlsx/
          README.md
          _source.xlsx
          sheets/
            01_Sheet1.png    ← 시트 통째 렌더링
            01_Sheet1.md     ← 시트 표
            01_Sheet1.formulas.json
```

형식별 산출물 매트릭스:

| 형식 | 시각 (PNG) | 텍스트/구조 | 그 외 |
|---|---|---|---|
| pptx/ppt | `slides/<idx>_<title>.png` (슬라이드별) | `slides/<idx>_<title>.md` + `.notes.md` (있을 때) | `charts/*.data.json`, `attachments/`, `macros/` |
| docx/doc | `pages/<NNN>.png` (페이지별) | `pages/<NNN>.md` | `images/`, `attachments/`, `macros/` |
| xlsx/xlsb/xls | `sheets/<idx>_<name>.png` (시트별) | `sheets/<idx>_<name>.md` + `.formulas.json` | `charts/*.data.json`, `images/<sheet>_<cell>`, `attachments/`, `macros/` |
| pdf | `pages/<NNN>.png` (페이지별) | `pages/<NNN>.md` | `attachments/` (PDF 임베드) |
| eml/msg | — | `body.md` / `body.html` / `headers.json` | `attachments/` (컨테이너면 재귀) |

`attachments/` 안 컨테이너 첨부는 같은 패턴으로 `<basename>_<ext>/` 폴더로 재귀 풀이된다.

## 산출물 사용

후속 스킬(sd-spec 등)은 결과 폴더의 `README.md` 한 번 Read 로 본문 요약·헤더·첨부 목록·손실 영역을 모두 파악할 수 있다. 컨테이너 첨부는 자체 `README.md` 를 가지므로 재귀적으로 같은 방식으로 들어간다.

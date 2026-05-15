---
name: sd-unpack
description: 메일·문서(eml/msg/pdf/docx/pptx/xlsx/xlsb, 레거시 doc/ppt/xls)를 첨부 포함 재귀적으로 풀어 평문 트리로 펼친다. Use when 위 형식 파일의 본문·첨부 전반을 훑어야 할 때 (분석·요약·정리·검토 등). 단순 단답 조회(특정 값/셀 확인)나 옆에 이미 펼친 `<basename>_<ext>/` 폴더가 있으면 호출 X.

---

# sd-unpack

## 호출

```
python .claude/skills/sd-unpack/scripts/unpack.py <입력파일 절대경로>
```

스크립트가 형식 분기·재귀 풀이·README 생성까지 알아서 처리한다. stdout 으로 결과 폴더 절대경로가 출력된다.

여러 파일을 풀어달라는 요청이 오면 단일 파일 단위로 반복 호출한다.

## 환경

Windows + MS Office 필요 (docx/pptx/xlsx 변환). Python 패키지 의존은 `ensure_pip` 가 자동 처리. COM 의존 미충족 시 해당 형식 핸들러는 throw.

## 결과 폴더

입력 파일 옆에 `<basename>_<ext>/` 가 생긴다. 컨테이너 첨부는 같은 패턴으로 재귀적으로 풀린다. 폴더 안 `_source.<ext>` + `README.md` 가 풀린 폴더의 식별 마커.

동일 입력 재호출 시 기존 결과 폴더는 사전 삭제 후 재생성 (이전 산출 잔존물 섞이지 않게).

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

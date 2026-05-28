---
name: sd-unpack
description: 메일·문서(eml/msg/pdf/docx/pptx/xlsx/xlsb, 레거시 doc/ppt/xls)를 첨부 포함 재귀적으로 풀어 평문 트리로 펼치기. Use when 위 형식 파일의 본문·첨부 전반을 훑어야 할 때 (분석·요약·정리·검토 등). 단순 단답 조회(특정 값/셀 확인)나 옆에 이미 펼친 `<basename>_<ext>/` 폴더가 있으면 호출 금지.

---

# sd-unpack

## 호출

```
python .claude/skills/sd-unpack/scripts/unpack.py <입력파일 절대경로>
```

스크립트가 형식 분기·재귀 풀이·README 생성까지 처리. stdout 으로 결과 폴더 절대경로 출력.

여러 파일을 풀어달라는 요청이 오면 단일 파일 단위로 반복 호출.

## 환경

Windows + MS Office 필요 (docx/pptx/xlsx 변환용). Python 패키지 의존은 `ensure_pip` 가 자동 처리. COM(Component Object Model) 의존 미충족 시 해당 형식 핸들러는 throw.

## 결과 폴더

입력 파일 옆에 `<basename>_<ext>/` 폴더 생성. 컨테이너 첨부는 같은 패턴으로 재귀적으로 풀림. 폴더 안 `_source.<ext>` + `README.md` 가 풀린 폴더의 식별 마커.

동일 입력 재호출 시 기존 결과 폴더는 사전 삭제 후 재생성 (이전 산출 잔존물이 섞이지 않게).

시각은 PNG, 텍스트·구조는 JSONL/JSON/MD 로 분리 출력.

```
meeting_eml/
  README.md            ← 진입점. 헤더·첨부 목록·손실 영역
  _source.eml          ← 원본
  body.md              ← 본문 평문 (HTML→평문 추출 포함)
  body.html            ← 원본 HTML (있을 때)
  headers.json         ← 헤더 (envelope 추적 키 포함)
  images.rels.json     ← CID↔첨부 파일명 매핑 (인라인 이미지 있을 때)
  attachments/
    report_pptx/             ← 컨테이너 첨부 재귀 풀이
      README.md
      _source.pptx
      slides/
        01_<title>.png       ← 슬라이드 통째 렌더링
        01_<title>.jsonl     ← 한 줄=한 노드 (시각 순서 정렬)
      charts/
        slide15_chart03.data.json
      images/
    embedded_xlsx/
      README.md
      _source.xlsx
      workbook.meta.json     ← defined names·sheet_code_map (있을 때)
      sheets/
        01_Sheet1.png        ← 시각 (서식·바탕색·border 모두)
        01_Sheet1.jsonl      ← 분석 데이터 (값·number_format·수식·merges 등)
```

형식별 산출물 매트릭스:

| 형식 | 시각 (PNG) | 텍스트/구조 (JSONL) | 그 외 |
|---|---|---|---|
| pptx/ppt | `slides/<idx>_<title>.png` | `slides/<idx>_<title>.jsonl` (슬라이드별 노드) | `charts/*.data.json`, `images/`, `attachments/`, `macros/` |
| docx/doc | `pages/<NNN>.png` (시각 검증용) | `content.jsonl` (단일 시퀀스), `pages.meta.json` (PNG↔노드 매핑) | `images/`, `attachments/`, `macros/` |
| xlsx/xlsb/xls | `sheets/<idx>_<name>.png` (일반 시트만) | `sheets/<idx>_<name>.jsonl` (값·수식·시트 메타), `workbook.meta.json` | `charts/sheet<idx>_chart*.data.json` (일반 시트 안 차트 + Chartsheet 의 차트), `images/<sheet>_<cell>`, `attachments/`, `macros/` |
| pdf | `pages/<NNN>.png` | `pages/<NNN>.jsonl` (블록 bbox + 표 셀 단위) | `images/p<NNN>_b<bid>.<ext>`, `attachments/` (PDF 임베드) |
| eml/msg | — | `body.md` (평문 본문), `headers.json`, `images.rels.json` | `body.html` (원본), `attachments/` (컨테이너면 재귀) |

`attachments/` 안 컨테이너 첨부는 같은 패턴의 `<basename>_<ext>/` 폴더로 재귀 풀이.

## JSONL 공통 규약

모든 jsonl 출력은 **한 줄 = 한 노드 (또는 한 행/셀)**. 빈 키 생략. JSON 네이티브 타입 보존. datetime → ISO 8601 문자열.

조회 패턴:
- 좌표·인덱스로 직접 grep (`"r":11`·`"slide":5`·`"node":42`).
- 키 grep (`"type":"heading"`·`"_f"` 수식 행만).
- Read offset = 행/노드 인덱스 1:1 (빈 노드도 한 줄 유지).

## xlsx jsonl 규약

시트별 `.jsonl` — 분석 핵심 (값·number_format·수식·merges·hyperlinks·comments) 보존. 시각 표시 (바탕색·border·폰트)·frozen·dims 는 미보존 (PNG 가 시각 보조 역할, 필요 시 `_source.xlsx` 직접 추출).

- 첫 줄: `{"_meta":{"merges":["A1:C1",...], "number_formats":{"E1":"yyyy-mm-dd",...}, "hyperlinks":{"D5":"http://..."}, "comments":{"E3":"메모"}}}`.
  - `merges`: 머지된 셀 영역 (셀 좌표 해석에 필수 — 머지 영역 안 빈 셀 오해 방지).
  - `number_formats`: General(기본) 외 셀 표시 형식 — Date·통화·% 등 셀 값 의미 단서.
  - `hyperlinks`: 셀 URL (URL 자체가 셀 정보).
  - `comments`: 셀 메모.
  - 비어있는 메타 키는 생략 (모두 비면 `{"_meta":{}}`).
- 데이터 줄: `{"r":11, "A":"P001", "I":7800, "J":12.5, "_f":{"I":"=SUM(...)", "J":"=I11*1.5"}}`.
  - `r`: 1-based 행번호 (Excel 동일).
  - 열문자 키 (`A`·`B`·...·`AA`·...): 셀 값. 빈 셀은 키 생략.
  - `_f`: 같은 행 수식 맵 `{열문자: 수식문자열}`. 수식 없는 행은 키 생략.
- 빈 행도 `{"r":N}` 한 줄 유지 → Read offset = 행번호 (오프바이원 방지).
- 값 타입: JSON 네이티브 (`int`·`float`·`bool`·`str`), datetime 은 ISO 8601 문자열.

### Chartsheet (시트 자체가 차트)

xlsx 안 시트는 일반 Worksheet 외에 **Chartsheet** (셀 없이 차트 1개만 있는 시트) 도 있을 수 있음.

- Chartsheet 는 `sheets/<idx>_<name>.jsonl` 미생성 (셀 없음).
- Chartsheet 의 차트 데이터: `charts/sheet<idx>_chart.data.json`.
- README 의 sheet_summaries 항목에 `(chart sheet — "...")` 명시.
- 일반 시트·Chartsheet 를 통합한 시트 순서 (idx) 대로 보존.

### 워크북 단위 `workbook.meta.json`

시트 외 워크북 공통 정보 (있을 때만 생성):

- `defined_names`: `{"이름":["'Sheet1'!$A$1:$C$10", ...]}` (다중 destination 시 list 다수 항목).
- `sheet_code_map`: `{"Sheet1":"BOA", ...}` (VBA codeName → raw 시트명. 매크로 모듈 파일명과 매칭용).
- `pivots`: pivot table 정의 list. 각 항목 `{name, source, location, rowFields, colFields, pageFields, dataFields}`. 결과 셀은 시트별 jsonl 에 일반 셀로 들어감.

## pptx jsonl 규약

슬라이드별 `slides/<idx>_<title>.jsonl` 생성. 원본 XML 순서 (shape_idx 순) 그대로 유지. 시각 순서는 `pos` 좌표 기반으로 Claude 가 필요시 정렬.

- 첫 줄: `{"_meta":{"slide":N, "title":"슬라이드 제목 또는 빈 문자열", "size":[w,h], "shapes":S}}`.
  - `size`: 슬라이드 폭/높이 (EMU 단위, python-pptx 원본).
  - `shapes`: 노드 수.
- 노드 줄: `{"slide":N, "type":"<type>", "pos":[x,y,w,h], "shape_idx":S, ...추가 키}`.
  - `slide`: 1-based 슬라이드 번호.
  - `type`: 노드 종류 (아래).
  - `pos`: [x,y,w,h] EMU 좌표 (914400 EMU = 1 inch).
  - `shape_idx`: 원본 XML shape index (0-based).

노드 type:
- `title`: 슬라이드 제목 placeholder. 키 `text`·`para_idx`.
- `para`: 일반 문단. 키 `text`·`para_idx`.
- `bullet`: 글머리 항목 (paragraph.level > 0). 키 `text`·`para_idx`·`level`.
- `table_cell`: 표 셀. 키 `table_idx`·`row`·`col` (1-based)·`text`.
  - 셀 안 multi-paragraph 는 `\n` join.
- `image`: 그림. 키 `ref` (`images/...` 상대경로).
- `chart`: 차트. 키 `ref` (`charts/...` 상대경로).
- `shape`: 도형/SmartArt/그룹. 키 `subtype`.

paragraph 안 hyperlink 가 있으면 `hyperlinks`: `[{"text":"...", "url":"..."}, ...]` 추가 키 (run 단위).

같은 표·차트의 노드들은 `shape_idx` 가 동일.

## docx jsonl 규약

문서 단일 시퀀스 `content.jsonl` 생성. 페이지 단위는 폐기 (Word 렌더 산물이라 원본 구조와 무관). 원본 시퀀스는 python-docx 의 문단·표·이미지 시퀀스를 따름.

- 첫 줄: `{"_meta":{"paragraphs":P, "tables":T, "images":I}}`.
- 노드 줄: `{"node":N, "type":"<type>", ...추가 키}`.
  - `node`: 0-based 시퀀스 인덱스 (Read offset = node).

노드 type:
- `heading`: 키 `text`·`level` (1·2·3·...) — docx Heading 스타일 기반만 (휴리스틱 추정 금지).
- `para`: 키 `text` (빈 paragraph 도 노드로 보존, text="").
- `bullet`: 키 `text`·`level` (0-based ilvl).
- `table_cell`: 키 `table_idx`·`row`·`col` (1-based)·`text`. 머지 시 `colspan` 추가 (gridSpan>1 일 때만). vMerge='continue' cell 은 skip (origin 만).
- `image`: 키 `ref` (`images/...` 상대경로).

paragraph 안 hyperlink 가 있으면 `hyperlinks`: `[{"text":"...", "url":"..."}, ...]` 추가 키.

페이지 매핑 별도 `pages.meta.json`:
- `{"001":{"text":"<페이지 평문>"}, "002":{...}, ...}` (PNG 페이지 ↔ fitz 추출 raw text).
- PNG 는 fitz 페이지 분할 그대로 (시각 검증용).
- 노드 인덱스 자동 매핑은 미적용 (fitz·python-docx 의 텍스트 분할 차이로 오매핑 위험) — Claude 가 페이지 text 와 content.jsonl 의 노드 text 를 직접 grep 비교.

## pdf jsonl 규약

페이지별 `pages/<NNN>.jsonl` 생성. PDF 페이지는 원본 단위.

- 첫 줄: `{"_meta":{"page":N, "size":[w,h], "blocks":B, "tables":T, "table_cells":C, "form_fields":F, "annotations":A}}`.
- 노드 줄:
  - `text_block`: `{"page":N, "block":B, "type":"text_block", "bbox":[x0,y0,x1,y1], "text":"..."}`.
  - `image_block`: `{"page":N, "block":B, "type":"image_block", "bbox":[...], "ref":"images/p001_b03.png"}`.
  - `table_cell`: `{"page":N, "type":"table_cell", "table_idx":T, "table_bbox":[...], "row":R, "col":C, "text":"..."}`.
  - `form_field`: `{"page":N, "type":"form_field", "name":"...", "field_type":"text", "value":"...", "bbox":[...]}` (PDF 양식 입력란).
  - `annotation`: `{"page":N, "type":"annotation", "subtype":"Highlight", "bbox":[...], "content":"...", "author":"..."}` (주석·highlight·sticky note).
- 모든 블록 보존 (표 영역과 겹쳐도 skip 안 함) — find_tables 정확도 100% 가정 시 정보 손실 위험을 회피. text_block·image_block·table_cell 노드가 동일 영역에 중복 출력될 수 있음. Claude 가 양쪽을 비교하여 판단.
- bbox 는 PDF 기준 좌표 (left-top, pt 단위, raw float).

heading 추출은 미적용 (PDF 는 style 정보 없음). OCR 미적용 (스캔 PDF 는 image_block 만 추출).

## 인라인 이미지 매핑 (eml/msg)

본문 안 `<img cid:...>` 가 첨부의 어느 파일인지 추적.

- `images.rels.json`: `{"<cid>":"attachments/image001.png", ...}` (HTML 본문 안 cid → 첨부 파일명 매핑).
- HTML→평문 변환본의 원래 `<img>` 위치에 `![image001.png](attachments/image001.png)` placeholder 삽입.
  - text/plain 만 있을 때 → `body.md` 자체가 변환본 → placeholder 포함.
  - text/plain·HTML 둘 다 있을 때 → `body.md` 는 plain (placeholder 없음), `body.from_html.md` 가 변환본 (placeholder 포함).
- 인라인 이미지 없으면 `images.rels.json` 미생성.

## TNEF (winmail.dat) 풀이

Outlook RTF 메일이 첨부를 `winmail.dat` 단일 binary (TNEF, Transport Neutral Encapsulation Format) 로 패키징한 경우, `tnefparse` 로 내부 첨부를 추출하여 `attachments/` 에 풀어 둠. 원본 `winmail.dat` 도 유지 (원본 보존).

내부 첨부가 컨테이너 (xlsx·pptx 등) 면 재귀 풀이 (다른 첨부와 동일).

## eml/msg 본문 규약

본문 흐름 정확성 (text/plain 우선) 과 인라인 이미지 위치 단서 (HTML→평문 변환본) 를 둘 다 보존:

- `body.md`: 항상 별도 파일 (인라인 cutoff 폐기).
  - text/plain 있으면 우선 — 발신자가 의도한 평문, 변환 잡음 없음.
  - 없으면 text/html → 평문 추출.
- `body.from_html.md`: text/plain·HTML 둘 다 있을 때만 별도 생성.
  - HTML→평문 변환본 (이미지 위치 placeholder 포함).
  - `body.md` 가 plain 이라 누락된 위치 정보를 보완.
- `body.html`: 원본 HTML (있을 때).
- `headers.json`: 모든 메일 헤더를 원본 그대로 보존 (envelope + `X-Mailer`·`Authentication-Results` 등 모두). 동일 키 다수면 list 로 누적.
  - `README.md` 헤더 섹션에는 표준 envelope 키만 표기 (전체는 `headers.json` 직접 조회).

## xlsb 클린업

- legacy → xlsx 변환 시 `_converted.xlsx` 는 임시 폴더에서만 처리 (산출 폴더에 잔존시키지 않음).
- VBA(Visual Basic for Applications) 매크로는 원본 코드 그대로 `macros/<모듈명>.vba` 에 저장 (변형 금지).
- VBA 시트 객체명 ↔ raw 시트명 매핑은 `workbook.meta.json` 의 `sheet_code_map` 키에 저장 (예: `{"Sheet1":"BOA","Sheet3":"Mapping"}`).

## 산출물 사용

후속 스킬 (sd-spec 등) 은 결과 폴더의 `README.md` 를 한 번 Read 하여 본문 위치·헤더·첨부 목록·손실 영역을 모두 파악 가능. 컨테이너 첨부는 자체 `README.md` 를 가지므로 같은 방식으로 재귀 진입.

각 형식별 jsonl 의 grep 패턴:
- xlsx: `"r":<행>` · `"_f"` (수식 행) · 열문자 키.
- pptx: `"slide":<N>` · `"type":"<type>"` · `"shape_idx":<S>`.
- docx: `"node":<N>` · `"type":"heading"` · `"table_idx":<T>`.

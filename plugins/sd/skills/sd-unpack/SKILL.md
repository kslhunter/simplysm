---
name: sd-unpack
description: 문서, 메일(eml, msg, pdf, docx, pptx, xlsx, xlsb, doc, ppt, xls)을 첨부 포함 재귀적으로 풀어 평문 트리로 펼침. Use when 해당 형식의 본문, 첨부를 훑어야 할 때. 단순 단답 조회면 호출 금지.
model: sonnet[1m]
effort: low
---

# sd-unpack

## 스크립트 호출

```
python "${CLAUDE_SKILL_DIR}/scripts/unpack.py" <입력파일 절대경로>
```

- 스크립트가 형식 분기, 첨부 재귀 풀이, README 생성까지 모두 처리합니다. 결과 폴더의 절대경로가 출력됩니다.
- 여러 파일을 풀어달라는 요청이면 파일 단위로 반복 호출하세요.
- Python 패키지 의존은 자동 설치합니다.
- docx, pptx, xlsx 와 레거시 doc, ppt, xls, xlsb 는 Windows + MS Office(COM) 가 필요합니다. eml, msg, pdf 는 불필요합니다.
- 실패 시 예외를 그대로 throw 합니다. 임의로 우회하지 말고 traceback 을 보고하세요.

## 결과

입력 파일 옆에 `<basename>_<ext>/` 폴더가 생성됩니다. 같은 입력으로 다시 호출하면 기존 폴더를 삭제하고 다시 만듭니다.

- 폴더 안 `_source.<ext>` + `README.md` 가 풀린 폴더의 식별 마커입니다.
- 첨부는 같은 규칙으로 재귀적으로 펼쳐집니다.
- 산출물 구성, 본문 위치, 손실 영역은 생성된 `README.md` 가 안내합니다. 결과를 읽을 때는 그 README.md 부터 여세요.

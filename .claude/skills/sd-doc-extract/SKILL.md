---
name: sd-doc-extract
description: 문서 파일(docx, xlsx, xlsb, pptx, pdf, eml, msg)에서 텍스트, 이미지, 임베디드 파일을 추출하는 스킬. "문서 추출", "문서 분해", "docx 분석", "PDF 내용 뽑아줘", "eml 파일 추출" 등을 요청할 때 사용한다.
model: haiku
---

# sd-doc-extract: 문서 분해/추출

바이너리 문서 파일에서 텍스트·이미지·임베디드 파일을 추출하여 LLM이 읽을 수 있는 마크다운과 개별 파일로 변환한다.

## 지원 포맷

| 확장자 | 포맷 |
|--------|------|
| `.docx` | Word |
| `.xlsx` | Excel |
| `.xlsb` | Excel (Binary) |
| `.pptx` | PowerPoint (Windows + PowerPoint 설치 필요) |
| `.pdf` | PDF |
| `.eml` | Email |
| `.msg` | Email (Outlook) |

## Step 1: 파일 경로 확인

사용자가 제공한 파일 경로를 확인한다.

- **파일이 없으면**: 존재하지 않음을 알리고 중단한다.
- **확장자가 지원 포맷이 아니면**: 지원하지 않는 형식임을 알리고, 위 지원 포맷 목록을 안내한 뒤 중단한다.

## Step 2: 추출 실행

Bash 도구로 `extract.py`를 실행한다:

```bash
python .claude/skills/sd-doc-extract/extract.py "<file_path>"
```

- 파일과 같은 디렉토리에 `{stem}/` 폴더가 생성되고, 이미지·임베디드 파일이 저장된다.
- 임베디드 파일 중 지원 포맷이면 자동으로 재귀 추출된다.
- stdout으로 생성된 인덱스 `.md` 파일의 경로가 출력된다.

## Step 3: 결과 보고

추출 완료 후 사용자에게 보여줄 내용:

- 생성된 인덱스 `.md` 파일 경로
- 추출 요약 (이미지 N개, 임베디드 파일 N개 등)
- 에러가 있었다면 stderr 내용

## 출력 마크다운 형식

`extract.py`가 생성하는 인덱스 `.md`는 이미지와 embedded 파일을 **원문에서 등장하는 위치에 인라인 배치**한다. 별도 "추출 파일" 테이블로 분리하지 않는다 — 분리하면 후속 LLM 분석 시 이미지-텍스트 매핑이 끊어지기 때문이다.

### 인라인 배치 원칙

각 추출기는 텍스트에 `[IMG:N]`, `[EMB:N]` 플레이스홀더를 삽입하고, `extract.py`가 이를 실제 마크다운 링크로 치환한다.

| 포맷 | 이미지 배치 | Embedded 배치 |
|------|-----------|--------------|
| PPTX | 슬라이드당 PNG 렌더링(PowerPoint COM) + `[SLIDE:N]` 삽입, 개별 이미지 분해 없음 | OLE 객체를 만난 슬라이드 내에 `[EMB:N]` 삽입 |
| DOCX | run 순회 중 drawing/blip을 만나면 그 문단에 `[IMG:N]` 삽입 | OLE 객체를 만난 위치에 `[EMB:N]` 삽입 |
| PDF | 페이지별 이미지를 해당 페이지 텍스트 내에 `[IMG:N]` 삽입 | 첨부파일은 문서 끝에 `[EMB:N]` 배치 (PDF 첨부는 페이지 귀속이 아님) |
| XLSX | 시트 데이터는 마크다운 테이블(열 헤더=Excel 열 문자 A/B/C…, 첫 열=원본 행 번호)로 렌더링. 이미지 앵커 행에서 테이블을 분리하고 `[IMG:N]` 삽입 후 새 테이블 재개 | 시트의 embeddings 디렉토리에서 추출한 객체를 문서 끝에 `[EMB:N]` 배치 |
| XLSB | 시트 데이터는 XLSX와 동일한 마크다운 테이블 포맷 (이미지 없음). VBA 매크로가 있으면 모듈별 소스코드를 fenced code block으로 추출하고, 의심 패턴(AutoExec/Suspicious/IOC) 분석 테이블을 첨부 | (embedded 없음) |
| EMAIL | HTML 본문의 `cid:` 참조 위치에 `[IMG:N]` 삽입, data URI 이미지도 등장 위치에 삽입 | 첨부파일은 본문 뒤에 `[EMB:N]` 배치 |

### 치환 결과 예시

```markdown
[Slide 1]
![slide_001.png](scheduling-1/slide_001.png)
[TXT] (left=0.4", top=0.4") 1. 일정 및 정보 변경
[TXT] (left=0.6", top=0.8") - Case1~5번 공통 적용 사항
[TXT] (left=0.5", top=1.4") 1) 구성
[TXT] (left=0.8", top=2.8") 프로세스: BOA 선택 ...

> embedded: [embedded_001_worksheet.xlsb](scheduling-1/embedded_001_worksheet.md)
```

PPTX는 슬라이드별 PNG 렌더링(PowerPoint COM)으로 오버레이 도형·주석 박스의 공간 관계를 보존한다. 개별 이미지 추출은 하지 않는다(스크린샷에 포함되므로 중복). 텍스트 shape는 `[TXT]`로 병행 수록하여 원문 인용 정확도를 확보한다.

## 주의사항

- 바이너리 문서를 Read 도구로 직접 열면 의미 있는 내용을 얻을 수 없다. 반드시 `extract.py`를 통해 추출한다.
- 출력 디렉토리는 기본값(파일 옆 `{stem}/`)을 사용한다. 사용자가 명시적으로 다른 경로를 요청한 경우에만 두 번째 인자로 전달한다.

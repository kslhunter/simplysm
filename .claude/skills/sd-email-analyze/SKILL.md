---
name: sd-email-analyze
description: 이메일 파일(.eml/.msg)을 분석하여 헤더, 본문, 인라인 이미지, 첨부파일을 추출. 사용자가 .eml/.msg 파일의 내용 확인이나 분석을 요청할 때 사용
argument-hint: "<이메일 파일 경로>"
---

# sd-email-analyze: 이메일 파일 분석 및 내용 추출

`.eml` 및 `.msg`(Outlook) 이메일 파일을 파싱하여 메일 헤더, 본문, 인라인 이미지, 첨부파일을 추출하고 분석한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 이메일 파일 경로를 추출한다.
- `$ARGUMENTS`가 비어있으면 현재 대화 맥락에서 이메일 파일 경로를 파악한다. 대화 맥락도 없으면 AskUserQuestion으로 파일 경로를 요청한다
- 지원 형식: `.eml`, `.msg`
- 파일이 존재하지 않거나 지원하지 않는 확장자이면 AskUserQuestion으로 올바른 경로를 요청한다

## 2. 이메일 파일 파싱

다음 명령을 실행하여 이메일 파일을 파싱한다:

```bash
python ${CLAUDE_SKILL_DIR}/email-analyzer.py <이메일_파일_경로>
```

- 최초 실행 시 `extract-msg` 패키지가 자동 설치된다
- 출력은 마크다운 리포트(stdout)이며, 추출된 파일은 `<이메일_파일명>_files/` 디렉토리에 저장된다

### 출력 구조

| 섹션 | 내용 |
|------|------|
| Email Info | Subject, From, To, CC, Date, 첨부파일 수 |
| Body | 본문 텍스트 (plain text 우선, 없으면 HTML 스트립) |
| Inline Images | 저장된 인라인 이미지 파일 경로 테이블 |
| Attachments | 저장된 첨부파일 경로 테이블 |

## 3. 추출 파일 분석

2단계 출력의 파일 경로를 확인하고 다음을 수행한다. 인라인 이미지 확인과 첨부파일 분석은 독립적이므로 가능한 한 병렬로 수행한다.

### 인라인 이미지

Read 도구로 각 저장 경로의 이미지를 확인한다.

### 첨부파일

- 이미지 파일: Read 도구로 확인
- 문서 파일(DOCX, XLSX, PPTX, PDF): `/sd-document` 스킬로 분석

## 4. 완료 안내

분석이 완료되면 다음을 출력한다:
- 3단계에서 수행한 파일별 분석 결과 요약 (2단계에서 이미 출력된 이메일 기본 정보는 반복하지 않는다)

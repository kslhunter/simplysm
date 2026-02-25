# sd-document 스킬 설계

## 개요

기존 `document-skills` 플러그인(14개 스킬, ~1,870 tokens)을 단일 `sd-document` 스킬로 대체한다.
필요한 기능만 포함하여 context 낭비를 줄이고, pip 라이브러리만으로 구성한다.

## 요구사항

| 포맷 | 읽기 | 쓰기 | 비고 |
|------|------|------|------|
| DOCX | O | O | 메일 양식 수준, 가끔 기존 문서 수정 |
| XLSX | O | O | 데이터 + 수식 (서식 불필요) |
| PPTX | O | X | 읽기만 |
| PDF  | O | X | 읽기만 |

## 디렉토리 구조

```
.claude/skills/sd-document/
├── SKILL.md
├── extract_docx.py    # DOCX 읽기 (텍스트 순서 + 이미지 추출)
├── extract_xlsx.py    # XLSX 읽기 (데이터 + 이미지 추출)
├── extract_pptx.py    # PPTX 읽기 (텍스트 + 좌표 + 이미지 추출)
└── extract_pdf.py     # PDF 읽기 (텍스트 + 표 + 이미지 추출)
```

## 라이브러리

| 라이브러리 | 용도 | 설치 여부 |
|-----------|------|---------|
| `python-docx` | DOCX 읽기/쓰기 | 미설치 (자동설치) |
| `openpyxl` | XLSX 읽기/쓰기 | 설치됨 |
| `pandas` | XLSX 읽기 보조 | 설치됨 |
| `python-pptx` | PPTX 읽기 | 설치됨 |
| `pypdf` | PDF 이미지 추출 | 미설치 (자동설치) |
| `pdfplumber` | PDF 텍스트/표 추출 | 미설치 (자동설치) |

markitdown은 사용하지 않는다 (한글 인코딩 문제, 이미지 내용 확인 불가).

## 읽기 설계

### 공통 원칙
- 포맷별 Python 스크립트로 추출
- 텍스트 + 이미지를 위치 정보와 함께 출력
- 이미지는 `<파일명>_files/` 디렉토리에 저장 → Claude Read로 분석
- Windows 한글 대응: 스크립트 상단 `sys.stdout` UTF-8 래핑
- 미설치 패키지 자동 pip install (첫 실행 시)

### 사용법
```bash
python .claude/skills/sd-document/extract_pptx.py <파일경로>
# stdout: 텍스트 + 좌표 정보
# 파일: <파일명>_files/img_001.png 등
```

### 포맷별 위치 정보

| 포맷 | 위치 표현 방식 |
|------|--------------|
| DOCX | 문단 흐름 순서 (텍스트-이미지-텍스트 인라인) |
| XLSX | 셀 위치 (A1, B2 등) |
| PPTX | shape별 left/top 좌표 + 슬라이드 번호 |
| PDF  | 페이지 좌표 (x, y) |

### 스캔 PDF (OCR)
- 텍스트 추출 결과가 비어있으면 스캔 PDF로 판단
- Tesseract OCR 미설치 시 안내 메시지 출력 (OS 레벨 설치 필요)
- `pytesseract`는 스킬에서 안내만, 자동설치 없음

## 쓰기 설계

### DOCX (`python-docx`)
- 새 문서 생성: 제목, 본문, 표, 목록
- 기존 문서 수정: 텍스트/표 내용 치환
- 용도: 메일 양식 수준

### XLSX (`openpyxl`)
- 데이터 + 수식 위주
- 서식(색상, 테두리 등) 불필요

## 연관 변경사항

- `sd-email-analyze/SKILL.md`: 첨부파일 처리 참조를 `document-skills` 플러그인 → `sd-document` 스킬로 변경
- `document-skills` 플러그인: 제거 (브레인스토밍 이후 별도 진행)

---
name: sd-outlook
description: Microsoft Graph API를 통해 Outlook 메일을 검색·다운로드하는 스킬. "메일 조회", "메일 검색", "특정 업체 메일 수집", "outlook" 등을 요청할 때 사용한다.
---

# sd-outlook: Outlook 메일 검색/다운로드

Microsoft Graph API로 Outlook 메일을 검색하고, 본문+첨부파일을 폴더에 다운로드한다.

## 설정

인증 정보는 `.codex/simplysm.json`의 `outlook` 섹션에서 자동으로 읽는다.

## Step 1: 요청 분석

사용자의 자연어 요청에서 검색 조건, 날짜 범위, 목적(검색/다운로드)을 파악하여 CLI 옵션으로 매핑한다.

## Step 2: 스크립트 실행

```bash
python .codex/skills/sd-outlook/outlook.py {search|download} [옵션...]
```

### KQL 검색 옵션 (AND 조합)

| 옵션 | KQL | 설명 |
|------|-----|------|
| `--from ADDR` | `from:` | 보낸사람 (이메일/도메인) |
| `--to ADDR` | `to:` | 받는사람 (이메일/도메인) |
| `--cc ADDR` | `cc:` | 참조 |
| `--bcc ADDR` | `bcc:` | 숨은참조 |
| `--subject TEXT` | `subject:` | 제목 키워드 |
| `--body TEXT` | `body:` | 본문 키워드 |
| `--keyword TEXT` | *(prefix 없음)* | 전체 키워드 (제목+본문) |
| `--has-attachment` | `hasattachment:yes` | 첨부 있는 메일만 |
| `--importance {high,normal,low}` | `importance:` | 중요도 필터 |

### 특수 검색 모드

| 옵션 | 설명 |
|------|------|
| `--domain DOMAIN` | from/to 양방향 OR 검색 + 중복 제거. 다른 KQL 옵션과 **조합 가능** |
| `--query KQL` | KQL 직접 입력. 다른 KQL 옵션과 **배타** |

### 필터 및 공통 옵션

| 옵션 | 설명 |
|------|------|
| `--after YYYY-MM-DD` | 시작일 (이상, 클라이언트 필터) |
| `--before YYYY-MM-DD` | 종료일 (이하, 클라이언트 필터) |
| `--outdir DIR` | 다운로드 저장 디렉토리 (`download` 전용) |
| `--user EMAIL` | 메일 계정 (기본: config의 defaultUser) |
| `--config PATH` | 설정 파일 (기본: `.codex/simplysm.json`) |

### 사용 예시

```bash
# 도메인 관련 전체 메일
python outlook.py search --domain example.com --after 2026-01-01 --before 2026-03-30

# 특정인이 보낸 첨부 있는 메일
python outlook.py search --from user@example.com --has-attachment

# 제목에 WMS 포함 + 중요 메일
python outlook.py search --subject WMS --importance high

# 도메인 메일 eml로 다운로드
python outlook.py download --domain example.com --after 2026-01-01 --outdir .tmp/mails

# KQL 직접 입력
python outlook.py search --query "from:user@a.com subject:견적"
```

## Step 3: 결과 보고

- `search`: stdout의 마크다운 표를 사용자에게 보여준다.
- `download`: stdout에 출력된 `index.md` 경로를 안내한다. 다운로드된 첨부파일의 분석이 필요하면 `sd-doc-extract` 스킬을 안내한다.

## 주의사항

- `--domain`과 `--query`는 상호 배타적이다. 둘 중 하나만 사용한다.
- `--query`에 `participants:` KQL 키워드를 사용하지 않는다 (Exchange 서버 에러 발생). 대신 `--domain`을 사용하거나 `from:` / `to:`를 개별 지정한다.
- `$search`와 `$filter`는 Graph API에서 동시 사용 불가하므로, 날짜 필터링은 클라이언트에서 처리된다.
- 429 Rate Limit 시 자동으로 `Retry-After`만큼 대기 후 재시도한다.

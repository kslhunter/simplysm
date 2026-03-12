---
name: sd-commit
description: "커밋", "commit", "sd-commit" 등을 요청할 때 사용.
---

# SD Commit — 변경사항 분석 후 커밋

변경사항을 스테이징하고, 변경 내용을 분석하여 커밋 메시지를 생성한 뒤 커밋한다.

ARGUMENTS: `all` (선택). 지정하면 모든 변경사항 대상, 미지정 시 대화 내 수정 파일만 대상.

---

## Step 1: 인자 파싱 및 스테이징

ARGUMENTS에서 `all` 여부를 확인하라.

- **`all`**: 워킹 트리의 모든 변경사항(수정, 삭제, 신규)을 스테이징하라.
- **`all`이 아니거나 인자 없음**: 현재 대화에서 Edit 또는 Write 도구로 수정하거나 생성한 파일들만 스테이징하라. 대화 컨텍스트를 되돌아보며 해당 파일 목록을 추출하라.

## Step 2: 변경사항 확인

스테이징된 변경사항이 없으면 "커밋할 변경사항이 없습니다."라고 안내하고 **종료**하라.

## Step 3: 커밋 메시지 생성 및 커밋

스테이징된 diff를 분석하여 아래 규칙에 따라 커밋 메시지를 생성하고 커밋하라.

### 커밋 메시지 규칙

- **Conventional Commits** 형식: prefix + 설명
  - prefix 예: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`, `perf`, `ci`, `build`
- **subject** (첫 줄): 변경 요약. 70자 이내.
- **body**: 빈 줄 후 주요 변경 내용을 나열. 여러 주제의 변경이 섞여 있으면 주제별로 `[prefix]` 태그를 붙여 그룹화하라.
- 마지막에 `Co-Authored-By: Claude <noreply@anthropic.com>` 포함.

단일 주제 예시:
```
feat: 사용자 인증 로직 추가

- AuthService에 JWT 토큰 검증 로직 구현
- 로그인 페이지에 폼 유효성 검사 추가

Co-Authored-By: Claude <noreply@anthropic.com>
```

여러 주제 예시:
```
chore: 인증 기능 추가 및 결제 오류 수정

[feat] 사용자 인증
- AuthService에 JWT 토큰 검증 로직 구현
- 로그인 페이지에 폼 유효성 검사 추가

[fix] 결제 모듈
- 결제 실패 시 재시도 로직 수정

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Step 4: 결과 출력

커밋 완료 후 커밋 메시지 전문을 사용자에게 보여줘라.

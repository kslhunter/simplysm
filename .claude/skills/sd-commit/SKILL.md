---
name: sd-commit
description: 변경사항을 분석하여 [type] scope 형식의 커밋 메시지를 생성하고 커밋. 사용자가 커밋을 요청할 때 사용
argument-hint: "[all]"
---

# sd-commit: 커밋

변경사항을 분석하여 커밋 메시지를 생성하고 커밋한다.

## 1. 인자 파싱

`$ARGUMENTS`에서 staging 전략을 결정한다.

| 인자 | 동작 |
|------|------|
| (없음) | modified/untracked 파일을 `git add {파일1} {파일2} ...`로 일괄 staging (시크릿 파일 제외) |
| `all` | `git add -A`로 모든 변경사항(untracked 포함)을 staging |

## 2. 정보 수집

### `all` 인자인 경우

1. Bash로 `git add -A`를 실행하여 모든 변경사항을 먼저 staging한다
2. 이후 다음 명령어를 Bash로 **병렬 실행**한다:
   - `git status` (staging 결과 확인, `-uall` 플래그 금지)
   - `git diff --staged` (staging된 전체 변경사항 확인)

### 인자 없음인 경우

다음 명령어를 Bash로 **병렬 실행**한다:

- `git status` (untracked 파일 확인, `-uall` 플래그 금지)
- `git diff` (unstaged 변경사항)
- `git diff --staged` (staged 변경사항)

## 3. 변경사항 분석

### 3-1. 변경사항 없음

git status/diff 결과가 모두 비어있으면 (staged, unstaged, untracked 모두 없음):
- "커밋할 변경사항이 없습니다."를 출력하고 종료한다

### 3-2. 시크릿 파일 확인

변경 파일 중 시크릿 파일(`.env`, `credentials.json`, `*.key`, `*.pem` 등)이 포함되어 있으면:
- 해당 파일명을 명시하여 경고를 출력한다
- staging 대상 및 커밋 메시지에서 제외한다

### 3-3. 변경사항 분류

변경된 파일과 diff 내용을 분석하여 변경의 성격을 파악한다:
- `feat`: 새 기능 추가
- `fix`: 버그 수정
- `refactor`: 리팩터링 (동작 변경 없음)
- `test`: 테스트 추가/수정
- `docs`: 문서 변경
- `chore`: 빌드, 설정, 의존성 등 기타 변경

## 4. 커밋 메시지 작성

### 형식

첫 줄은 전체 변경사항을 요약하는 **커밋 헤더**이다.
빈 줄 후 `[type] scope` 헤더와 bullet point로 세부 내용을 기술한다.
마지막에 `Co-Authored-By` 트레일러를 포함한다.

```
{전체 요약 커밋 헤더}

[type] {변경 대상 요약}
- {세부 변경 내용}
- {세부 변경 내용}

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### 다중 변경사항

여러 종류의 변경이 있으면 `[type] scope` 그룹을 빈 줄로 구분하여 나열한다.

```
core-common 유틸 함수 추가 및 solid DatePicker 버그 수정

[feat] core-common 유틸 함수 추가
- StringUtil에 camelToKebab 변환 함수 추가

[fix] solid DatePicker 버그 수정
- timezone 오프셋 미적용으로 인한 날짜 표시 오류 수정

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### 단일 변경사항

변경이 한 종류이면 `[type] scope` 그룹 1개만 작성한다.

```
solid DatePicker timezone 버그 수정

[fix] solid DatePicker 버그 수정
- timezone 오프셋 미적용으로 인한 날짜 표시 오류 수정

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### 메시지 작성 원칙

- "what"이 아닌 "why"에 초점을 맞춘다
- 커밋 헤더는 간결하게 작성한다
- scope는 변경 대상을 요약한다

## 5. Staging 및 커밋

### Staging

- `all` 인자: 2단계에서 이미 staging 완료. 추가 작업 없음
- 인자 없음: 시크릿 파일을 제외한 변경 파일을 `git add {파일1} {파일2} ...`로 일괄 staging한다

### 커밋

HEREDOC 형식으로 커밋 메시지를 전달한다. `--no-verify`, `--no-gpg-sign` 등 hook 우회 플래그를 사용하지 않는다.

```bash
git commit -m "$(cat <<'EOF'
{커밋 메시지}
EOF
)"
```

`--amend`는 사용하지 않는다. 항상 새 커밋을 생성한다.

## 6. 커밋 후 검증

### 성공 시

Bash로 `git status`를 실행하여 커밋이 정상적으로 완료되었는지 확인한다.

### pre-commit hook 실패 시

실패 원인을 사용자에게 보고하고 중단한다.

## 7. 완료 안내

커밋 후 `git rev-parse HEAD`로 새 커밋 해시를 얻고, 해시와 커밋 메시지 전문을 함께 출력한다.
마지막에 "커밋을 취소하려면 수동으로 되돌리세요."라고 안내한다.

`git push`는 수행하지 않는다. git config는 수정하지 않는다.

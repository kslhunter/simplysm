---
description: Git 변경사항 분석 및 커밋 메시지 자동 생성
argument-hint: [--amend] [--push]
model: haiku
---

# /sd:commit - Git 커밋 메시지 자동 생성

$ARGUMENTS

## 트리거

- 커밋 요청
- 변경사항 저장

## 인수 파싱

| 옵션 | 설명 |
|------|------|
| `--amend` | 직전 커밋 수정 (미푸시 상태만) |
| `--push` | 커밋 후 자동 push |

## 커밋 메시지 포맷

```
제목: 전체 변경을 아우르는 한 줄 요약 (50자 이내)

- [패키지명] 변경 내용 (기능/목적 중심)
- [테스트:name] 테스트 관련 변경사항
- [공통] 전체 프로젝트 관련 변경사항
```

## 작성 규칙

- **한국어**, **능동태**
- **패키지별 그룹핑**
  - `packages/{name}/` → `[name]`
  - `tests/{name}/` → `[테스트:name]`
- **기능 단위 설명**: 파일 나열 X → 기능/목적 중심
- **emoji 금지**

## 실행 절차

### 1. 브랜치 확인

```bash
git branch --show-current
```

- feature 브랜치명에서 작업 맥락 파악 (커밋 메시지 작성에 활용)

### 2. 사전 정리

```bash
rm -f NUL || true  # Windows nul 파일 제거
```

**임시 파일 확인**:

```bash
find . -name "PLAN_*.md" -o -name "REVIEW_*.md" 2>/dev/null | grep -v node_modules
```

- 발견 시 → `AskUserQuestion`으로 삭제 여부 확인
  - 옵션: "삭제" / "유지 (경고 표시 후 진행)"
- 삭제 승인 → `rm`으로 삭제
- 유지 선택 → 경고 표시 후 계속 진행

### 3. 스테이징 및 확인

```bash
git add .
git diff --staged --name-status
```

- staged 없으면 → "변경사항 없음" 안내 후 종료
- 민감 파일 (`credentials`, `secret`, `.env`) → 경고

### 4. 변경 내용 분석

- `git diff --staged`로 변경 내용 파악
- 정확한 커밋 메시지 작성을 위해 충분히 분석
- **대용량 diff 처리**:
  - `git diff --staged --stat`으로 변경 파일 목록 먼저 확인
  - 핵심 파일 위주로 상세 분석
  - 필요시 Read 도구로 파일 직접 확인

### 5. 커밋 메시지 생성

- 위 포맷과 작성 규칙 준수
- 제목 50자 초과 시 축약

### 6. 사용자 확인

생성된 메시지 표시 → 승인/수정 요청

### 7. 커밋 실행

```bash
git commit -m "$(cat <<'EOF'
커밋 제목

- [패키지명] 변경 내용
EOF
)"
git status
```

`--amend` 옵션 시:
- `git status`로 미푸시 확인 필수
- `git commit --amend -m "..."`

### 8. Push (--push 옵션 시)

```bash
git push origin $(git branch --show-current)
```

- 실패 시 원인 안내 (권한, 충돌 등)

## 예외 처리

| 상황 | 대응 |
|------|------|
| 변경사항 없음 | "변경사항 없음" 안내 후 종료 |
| 민감 파일 포함 | 경고 표시 → 사용자 확인 후 진행 |
| pre-commit 실패 | 오류 원인 분석 → 수정안 제시 |
| push 실패 | 원인 안내 (충돌 시 pull 권장) |
| amend 불가 | 이미 푸시된 경우 안내 |

## 사용 예시

```bash
/sd:commit           # 일반 커밋
/sd:commit --amend   # 직전 커밋 수정
/sd:commit --push    # 커밋 후 push
```

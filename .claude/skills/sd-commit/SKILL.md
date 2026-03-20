---
name: sd-commit
description: |
  Stage all changes with `git add -A` and create a single commit with [type] scope grouped message.
  Triggered by /sd-commit or requests like "커밋", "commit", "변경사항 커밋".
---

# sd-commit: 그룹별 커밋

모든 변경사항을 스테이징하고, `[type] scope`별로 변경사항을 그룹화한 하나의 커밋을 생성한다. 커밋 메시지만으로 변경 구조가 파악되도록 작성한다.

모든 사용자 대상 출력은 반드시 사용자의 언어로 작성한다.

## 프로세스

```
Step 1: 전체 스테이징 → Step 2: Diff 분석 → Step 3: 메시지 작성 → Step 4: 확인 및 커밋
```

## Step 1: 전체 변경사항 스테이징

`git add -A`로 모든 변경사항을 스테이징한다.

스테이징 후, `git diff --staged --stat`과 `git diff --staged`를 실행하여 전체 변경 내역을 확인한다. 스테이징된 변경사항이 없으면 사용자에게 알리고 중단한다.

## Step 2: Diff 분석

변경된 각 파일을 정확히 하나의 `[type]`과 하나의 `scope`로 분류한다.

### 타입 분류

diff 내용을 검토하여 각 파일의 타입을 결정한다 — 파일 위치가 아닌, 변경이 *무엇을 하는지*를 기준으로 판단한다:

| 타입 | 사용 시점 |
|------|-----------|
| `[feat]` | 새로운 기능, 기능을 추가하는 새 파일 |
| `[fix]` | 버그 수정, 에러 수정 |
| `[refactor]` | 동작 변경 없는 코드 구조 개선 |
| `[style]` | 포맷팅, 공백, CSS만 변경 |
| `[docs]` | 문서, 주석, README |
| `[test]` | 테스트 추가 또는 수정 |
| `[chore]` | 설정, 의존성, 빌드 스크립트, 유지보수 |
| `[perf]` | 성능 개선 |

하나의 파일에 여러 타입이 혼재된 경우(예: 버그 수정과 새 기능), 변경의 주요 의도를 나타내는 지배적 타입을 할당한다.

### Scope 감지

변경된 파일의 경로에서 scope를 추출한다:

| 파일 경로 패턴 | Scope |
|----------------|-------|
| `packages/{name}/...` | `{name}` (예: `solid`, `core-common`) |
| `tests/{name}/...` | `tests/{name}` |
| 루트 레벨 파일 (`package.json`, `tsconfig.json` 등) | `root` |
| 기타 경로 | 첫 번째 의미 있는 디렉토리 세그먼트 |

## Step 3: 커밋 메시지 작성

### 형식

```
{scope 요약}

[{type}] {scope}
- {변경 설명}
- {변경 설명}

[{type}] {scope}
- {변경 설명}

Co-Authored-By: Claude <noreply@anthropic.com>
```

### 규칙

1. **제목 줄** (첫 번째 줄): 영향받는 scope를 나열하는 간결한 요약. 72자 이내. 예: `solid, core-common 변경` 또는 `solid 버튼 컴포넌트 추가`
2. 제목 뒤에 **빈 줄**
3. **본문**: `[type] scope`별로 변경사항을 그룹화한다. 각 그룹 내에서 개별 변경사항을 항목으로 나열한다
4. **그룹 정렬 순서**: `[feat]` → `[fix]` → `[refactor]` → `[perf]` → `[style]` → `[docs]` → `[test]` → `[chore]`
5. **scope별 하나의 그룹**: 여러 scope가 같은 타입을 공유하는 경우, 별도의 `[type] scope` 헤더로 나열한다 — 서로 다른 scope를 하나의 그룹으로 합치지 않는다
6. **Co-Authored-By**: 항상 빈 줄로 구분하여 마지막에 추가한다
7. **단일 타입 단축**: 모든 변경이 같은 타입이고 같은 scope인 경우, 제목에 타입을 직접 포함할 수 있다. 예: `[feat] solid: 버튼 컴포넌트 추가`

## Step 4: 확인 및 커밋

1. 완성된 커밋 메시지를 사용자에게 표시한다
2. `AskUserQuestion`으로 사용자 확인을 요청한다:
   - "Commit" — 표시된 메시지로 진행
   - "Edit" — 사용자가 메시지를 수정
3. 확인 후, HEREDOC을 사용하여 커밋을 생성한다:

```bash
git commit -m "$(cat <<'EOF'
{커밋 메시지}
EOF
)"
```

4. 커밋 후 `git status`를 실행하여 성공을 확인한다
5. 커밋 해시와 요약을 사용자에게 표시한다

## 출력 예시

`packages/solid/src/Button.ts` (신규 파일), `packages/solid/src/Input.ts` (신규 파일), `packages/core-common/src/StringUtil.ts` (버그 수정)에 변경이 있는 경우:

```
solid, core-common 변경

[feat] solid
- Button 컴포넌트 추가
- Input 컴포넌트 추가

[fix] core-common
- StringUtil 타입 에러 수정

Co-Authored-By: Claude <noreply@anthropic.com>
```

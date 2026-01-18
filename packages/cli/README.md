# @simplysm/cli

심플리즘 프레임워크의 CLI 도구입니다.

## 설치

```bash
npm install -g @simplysm/cli
# or
yarn global add @simplysm/cli
```

## 명령어

### lint

ESLint를 실행합니다.

```bash
# 전체 린트
sd-cli lint

# 특정 경로만 린트
sd-cli lint packages/core-common

# 자동 수정
sd-cli lint --fix

# 규칙별 실행 시간 출력
sd-cli lint --timing
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--fix` | 자동 수정 | `false` |
| `--timing` | 규칙별 실행 시간 출력 | `false` |
| `--debug` | debug 로그 출력 | `false` |

### typecheck

TypeScript 타입체크를 실행합니다.

```bash
# 전체 타입체크
sd-cli typecheck

# 특정 경로만 타입체크
sd-cli typecheck packages/core-common

# 여러 경로 타입체크
sd-cli typecheck packages/core-common tests/orm
```

**옵션:**

| 옵션 | 설명 | 기본값 |
|------|------|--------|
| `--debug` | debug 로그 출력 | `false` |

## 사용 예시

```bash
# 전체 린트
sd-cli lint

# 특정 패키지만 린트
sd-cli lint packages/core-common

# 특정 패키지 타입체크
sd-cli typecheck packages/core-common
```

## 라이선스

Apache-2.0

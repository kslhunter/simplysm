# @simplysm/cli

**이 문서는 패키지 사용자를 위한 가이드입니다.**
**개발자용 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.**

---

SIMPLYSM 프로젝트를 위한 CLI 도구입니다.

## 설치

```bash
yarn add -D @simplysm/cli
```

## 사용법

### lint

ESLint를 실행합니다. 기본 ESLint CLI보다 빠르게 동작합니다.

```bash
# 기본 사용
sd-cli lint "**/*.{ts,js,html}"

# 자동 수정
sd-cli lint "**/*.{ts,js,html}" --fix

# 규칙별 실행 시간 출력
sd-cli lint "**/*.ts" --timing

# 특정 경로만
sd-cli lint "src/**/*.ts"
```

## 명령어

| 명령어 | 설명 |
|--------|------|
| `lint [patterns..] [--fix] [--timing]` | ESLint 실행 |

## 라이선스

MIT

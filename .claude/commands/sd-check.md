---
description: 패키지 품질 검증 (타입체크 → ESLint → 테스트)
allowed-tools: Bash(npx tsc --noEmit:*), Bash(npx eslint:*), Bash(npx vitest:*)
---

# 패키지 품질 검증

CLAUDE.md의 "코드 품질 검증" 절차를 자동으로 실행합니다.

## 기능

사용자가 지정한 패키지 또는 전체 프로젝트에 대해 다음 순서로 검증을 진행합니다:

1. **타입체크**: `npx tsc --noEmit -p packages/{package}/tsconfig.json 2>&1 | grep "^packages/{package}/"`
2. **ESLint**: `npx eslint "packages/{package}/**/*.{ts,js,html}"` (--fix 옵션 지원)
3. **테스트**: `npx vitest run packages/{package}`

각 단계는 순차적으로 실행되며, 이전 단계가 성공해야 다음 단계로 진행합니다.
사용자가 검증의 종류를 선택해서 요청한 경우에는, 해당 검증만 수행합니다. 

## 대상 범위

- **패키지명이 주어진 경우**: 해당 패키지만 검증
- **패키지명이 없는 경우**: 전체 프로젝트 검증

## 에러 처리

에러 발생 시:

1. 관련 파일을 읽고 분석
2. 구체적인 수정 방안을 한국어로 제시
3. 사용자 승인 후 수정 진행

## 사용 예시

```bash
/sd-check                    # 전체 프로젝트 검증
/sd-check --fix              # 전체 프로젝트 검증 + ESLint 자동 수정
/sd-check orm-common         # orm-common 패키지만 검증
/sd-check sd-angular --fix   # sd-angular 패키지 검증 + ESLint 자동 수정
```

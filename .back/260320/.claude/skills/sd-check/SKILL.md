---
name: sd-check
description: check 명령어로 코드 품질 검사를 실행하고 에러를 자동 수정. 사용자가 코드 품질 검사 및 자동 수정을 요청할 때 사용
argument-hint: "[targets..]"
---

# sd-check: 코드 품질 검사 및 자동 수정

`check` 명령어를 실행하고, 발견된 에러를 분석하여 자동 수정한다. 수정 후 전체 check를 재실행하여 수렴시킨다.

## 1. 인자 파싱

`$ARGUMENTS`에서 targets를 파싱한다.

- `targets`는 공백으로 구분된 경로 또는 패키지 목록 (예: `packages/core-common packages/solid`)
- targets가 비어있으면 인자 없이 명령어를 실행한다 (프로젝트 기본 동작에 위임)
- targets의 kebab-case 형태를 topic으로 사용한다 (예: `packages/core-common` → `check-core-common`). targets가 비어있으면 topic은 `check`

## 2. 전제조건 검사

### check 스크립트 확인

프로젝트 루트의 package.json을 Read하여 `scripts`에 `check`이 있는지 확인한다.

- **없으면**: "package.json에 `check` 스크립트가 없습니다. `check` 스크립트를 추가하세요."를 출력하고 **종료**한다
- **있으면**: 계속 진행한다

### 패키지 매니저 탐지

프로젝트 루트의 lock 파일로 패키지 매니저를 판단한다:

- `pnpm-lock.yaml` 존재 → `pnpm`
- `yarn.lock` 존재 → `yarn`
- `package-lock.json` 존재 → `npm`
- 모두 없으면 → `npm` (기본값)

## 3. 보조 명령어 탐지

프로젝트 루트의 CLAUDE.md와 package.json에서 다음 보조 명령어를 탐지한다. **없어도 오류가 아니다** — check만으로 동작 가능하다.

### 탐지 대상

| 명령어 | CLAUDE.md 키워드 | package.json scripts 키워드 |
|--------|-----------------|---------------------------|
| typecheck | typecheck, 타입 검사, tsc | `typecheck`, `type-check`, `tsc` |
| lint | lint, 린트 검사 | `lint` |
| lint:fix | lint:fix, lint --fix, 린트 수정 | `lint:fix`, 또는 lint 스크립트에 `--fix` 추가 |
| test | test, vitest, jest, 단위 테스트 | `test`, `vitest`, `jest` |

### targets 지원 판단

- CLAUDE.md에서 해당 명령어 설명에 `[targets..]`, `[패키지]`, `[경로]` 등의 인자 형식이 기술되어 있으면 targets를 지원하는 것으로 판단한다
- package.json에서만 탐지된 명령어는 targets 미지원으로 간주한다

### 탐지 결과 표시

```
## 탐지된 명령어

| 명령어 | 상태 | targets 지원 |
|--------|------|-------------|
| check | ✅ {명령어} | {Yes/No} |
| typecheck | {명령어 또는 ⏭️ 미탐지} | {Yes/No} |
| lint | {명령어 또는 ⏭️ 미탐지} | {Yes/No} |
| lint:fix | {명령어 또는 ⏭️ 미탐지} | {Yes/No} |
| test | {명령어 또는 ⏭️ 미탐지} | {Yes/No} |
```

## 4. check 실행 및 로그 저장

1. `.tasks/{yyMMddHHmmss}_{topic}/` 디렉토리를 생성한다 (`yyMMddHHmmss`는 Bash `date +%y%m%d%H%M%S`)
2. `{PM} check {targets}`를 Bash로 실행하고, stdout+stderr를 `check.log`에 저장한다
3. 로그 파일을 Read하여 에러를 분석한다

**명령어 실행 자체 실패 처리:** `command not found`, 타임아웃 등 코드 에러가 아닌 환경 문제로 명령어가 실패하면, 에러 메시지를 사용자에게 보고하고 종료한다.

## 5. 에러 분석 및 자율 수정

에러가 없으면 → 7절(완료 안내)로 진행한다.

에러가 있으면 → 에러를 분석하고 코드를 수정한다 (6절의 수정 원칙 필수 준수). 수정 과정에서 **탐지된 보조 명령어를 자율적으로 활용**한다.

### 활용 예시 (강제가 아닌 가이드)

상황에 맞게 판단한다. 다음은 예시일 뿐이며, 반드시 이 순서를 따를 필요는 없다:

- **lint 에러** → lint:fix가 탐지되었으면 먼저 실행해보고, lint로 남은 에러를 확인한다
- **typecheck 에러** → 코드 수정 후 typecheck만 재실행하여 부분 검증한다
- **test 에러** → 코드 수정 후 test만 재실행하여 부분 검증한다
- **보조 명령어 미탐지** → 코드만 수정하고 전체 check에서 확인한다

### 수정 후 재실행

수정한 것이 있으면 → 4절로 돌아가 **새 타임스탬프로** 전체 check를 재실행한다 (최대 5회).
수정한 것이 없으면 (더 이상 수정 불가) → 남은 에러를 기록하고 7절(완료 안내)로 진행한다.

## 6. 수정 원칙 — 편법/우회방법 절대 금지

sd-check는 에러를 자동 수정하므로, "빨리 에러를 없애려는" 편법 유혹이 가장 큰 스킬이다. 반드시 **"왜 이 에러가 발생하는가?"를 근원까지 추적**하여 원인 자체를 제거해야 한다.

### 절대 하지 말 것

- `@ts-ignore`, `@ts-expect-error` 추가로 타입 에러 무시
- `eslint-disable`, `eslint-disable-next-line` 추가로 lint 에러 무시
- `try-catch`로 에러를 삼켜서 테스트 통과시키기
- `as any`, `as unknown as T` 등 타입 단언으로 타입 에러 회피
- 테스트 기대값을 실제 결과에 맞춰 변경 (테스트 의도를 훼손)
- 테스트 케이스를 삭제하거나 `.skip` 처리
- 조건문/플래그 변수를 추가하여 문제 경로를 우회

### 올바른 수정 방향

- 타입 에러 → 타입 정의, 인터페이스, 함수 시그니처를 올바르게 수정
- lint 에러 → 코딩 규칙에 맞게 코드 구조를 변경
- 테스트 실패 → 구현 코드의 로직을 수정하여 기대 동작을 달성
- CLAUDE.md에 코딩룰이 있으면 반드시 준수

## 7. 완료 안내

결과를 요약하여 출력한다:

```
## sd-check 결과

- check 실행: N회
- 최종 상태: ✅ 전체 통과 / ⚠️ 미해결 에러 있음

### 수정된 파일
- {파일 경로}: {변경 내용 요약}

### 미해결 에러 (있는 경우)
- {에러 내용}
```

커밋 안내: "커밋하지 않습니다. 필요 시 `/sd-commit`을 실행하세요."

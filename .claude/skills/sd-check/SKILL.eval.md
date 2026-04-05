# Eval: sd-check

## 행동 Eval

### 시나리오 1: pnpm 프로젝트 전체 스크립트 탐지

- 사전 조건:
  - `pnpm-lock.yaml`: 빈 파일
  - `package.json`:
    ```json
    {
      "name": "eval-project",
      "scripts": {
        "typecheck": "echo typecheck-pass",
        "lint": "echo lint-pass",
        "test": "echo test-pass",
        "build": "echo build",
        "dev": "echo dev"
      }
    }
    ```
- 입력: "/sd-check"
- 체크리스트:
  - [ ] lock 파일을 확인하여 패키지 매니저를 pnpm으로 결정했다
  - [ ] package.json의 scripts를 읽었다
  - [ ] typecheck, lint, test 3개를 탐지 결과로 표시했다
  - [ ] build, dev를 check 대상에 포함하지 않았다
  - [ ] typecheck → lint → test 순서로 실행을 시도했다

### 시나리오 2: npm 프로젝트 + 대체 스크립트명

- 사전 조건:
  - `package-lock.json`: 빈 파일
  - `package.json`:
    ```json
    {
      "name": "eval-project",
      "scripts": {
        "tsc": "echo tsc-pass",
        "eslint": "echo eslint-pass",
        "vitest": "echo vitest-pass"
      }
    }
    ```
- 입력: "/sd-check"
- 체크리스트:
  - [ ] lock 파일을 확인하여 패키지 매니저를 npm으로 결정했다
  - [ ] tsc를 타입 체크, eslint을 린트, vitest를 테스트 카테고리에 매칭했다
  - [ ] `npm run`으로 실행을 시도했다

### 시나리오 3: 스크립트 없는 프로젝트

- 사전 조건:
  - `yarn.lock`: 빈 파일
  - `package.json`:
    ```json
    {
      "name": "eval-project",
      "scripts": {
        "build": "echo build",
        "start": "echo start"
      }
    }
    ```
- 입력: "/sd-check"
- 체크리스트:
  - [ ] lock 파일을 확인하여 패키지 매니저를 yarn으로 결정했다
  - [ ] 매칭되는 check 스크립트가 없음을 인지했다
  - [ ] 실행할 명령어에 대해 사용자에게 질문했다

## 안티패턴 Eval

- [ ] lock 파일 확인 없이 패키지 매니저를 가정했다
- [ ] package.json의 scripts를 읽지 않고 명령어를 실행했다
- [ ] 탐지 결과를 표시하지 않고 바로 명령어를 실행했다
- [ ] typecheck보다 lint 또는 test를 먼저 실행했다

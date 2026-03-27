# 디버그: eslint-plugin root config에서 rootDir이 node_modules/로 잘못 resolve됨

## 에러 증상

- **에러 메시지:** `ENOENT: no such file or directory, scandir 'D:\workspaces-12\oscom\node_modules\packages'`
- **위치:** `packages/eslint-plugin/src/configs/root.js:11`
- **재현:** @simplysm/eslint-plugin을 의존성으로 사용하는 외부 프로젝트에서 `simplysmPlugin.configs.root`를 적용 후 `yarn check` 실행

## 근본 원인 추적 (ACH)

### ACH 매트릭스

|    | 증거1: 에러 경로가 `oscom\node_modules\packages` | 증거2: L11의 `"../../../.."` 하드코딩 | 증거3: 외부 프로젝트에서만 발생 |
|----|---|---|---|
| H1: import.meta.url 기반 상대경로 문제 | C — node_modules 내부에서 4단계 올라가면 정확히 이 경로 | C — 하드코딩된 상대 경로가 설치 위치에 따라 달라짐 | C — monorepo 내부에서는 정상, 외부에서만 문제 |
| H2: 사용자 설정 문제 | N | I → 폐기 — configs.root는 rootDir을 override하는 인터페이스를 제공하지 않음 | N |

### 결과: 확정 — H1

`root.js` 11번 라인의 `rootDir`이 `import.meta.url`에서 상대 경로 `"../../../.."`로 계산되므로, `node_modules/` 안에 설치된 경우 소비자 프로젝트의 루트가 아닌 `node_modules/` 디렉토리를 가리킨다.

## 해결 방안

### 방안 A: configs.root를 함수로 변경 (rootDir 매개변수)

- **설명:** `configs.root`를 함수로 변환하여 소비자가 `simplysmPlugin.configs.root(import.meta.dirname)`으로 호출
- **장점:** 어떤 설치 구조에서도 정확히 동작
- **반론:** API 브레이킹 체인지. 기존 소비자 코드 수정 필요
- **점수:** 정확성 9 / 안정성 8 / 범용성 10 → **평균 9.0/10**

### 방안 B: process.cwd() 사용

- **설명:** `rootDir` 계산을 `process.cwd()`로 대체
- **장점:** API 변경 없음. 기존 소비자 코드 수정 불필요
- **반론:** 서브디렉토리에서 ESLint 실행 시 잘못된 경로를 가리킬 수 있음 (실질적 위험 낮음)
- **점수:** 정확성 7 / 안정성 7 / 범용성 7 → **평균 7.0/10**

### 방안 C: 수행 안 함

- **설명:** 현재 상태 유지
- **장점:** 코드 변경 없음
- **반론:** 외부 프로젝트에서 플러그인 사용 불가
- **점수:** 정확성 0 / 안정성 10 / 범용성 0 → **평균 3.3/10**

## 선택 결과

**방안 B** (평균 7.0/10)

API 브레이킹 체인지 없이 `process.cwd()`로 대체. ESLint는 관례적으로 프로젝트 루트에서 실행하므로 실질적 위험이 낮다고 판단.

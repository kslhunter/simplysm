# Eval: sd-readme

## 행동 Eval

### 시나리오 1: 소규모 패키지 (capacitor-plugin-auto-update, src 6파일)
- 입력: "/sd-readme capacitor-plugin-auto-update"
- 체크리스트:
  - [ ] packages/capacitor-plugin-auto-update/README.md 파일이 생성됨
  - [ ] docs/ 폴더가 생성되지 않음 (소규모이므로 README.md 하나로 완결)
  - [ ] README.md에 패키지 이름(@simplysm/capacitor-plugin-auto-update)이 포함됨
  - [ ] README.md에 설치 방법(npm install)이 포함됨
  - [ ] README.md에 package.json의 exports/main에서 추적한 public API가 문서화됨
  - [ ] src/index.ts에 없는 internal 모듈은 문서화되지 않음
  - [ ] README.md가 영어로 작성됨

### 시나리오 2: 대규모 패키지 (solid, src 126파일)
- 입력: "/sd-readme solid"
- 체크리스트:
  - [ ] packages/solid/README.md 파일이 생성됨
  - [ ] packages/solid/docs/ 폴더가 생성됨
  - [ ] README.md에 패키지 개요와 설치 방법이 포함됨
  - [ ] README.md에 docs/ 내 각 파일에 대한 목차(파일명 + 설명)가 포함됨
  - [ ] docs/ 파일들이 index.ts의 #region 카테고리 기반으로 분할됨
  - [ ] 각 docs/*.md에 해당 카테고리의 API 시그니처가 포함됨
  - [ ] src/index.ts에 없는 internal 모듈은 문서화되지 않음
  - [ ] 모든 문서가 영어로 작성됨

### 시나리오 3: root README 생성 (인자 없이 실행)
- 사전 조건:
  - packages/pkg-a/package.json: `{ "name": "@simplysm/pkg-a", "description": "Common utilities", "main": "./dist/index.js" }`
  - packages/pkg-a/src/index.ts: `export function hello(): string { return "hi"; }`
  - packages/pkg-b/package.json: `{ "name": "@simplysm/pkg-b", "private": true, "main": "./dist/index.js" }`
  - packages/pkg-b/src/index.ts: `export function internal(): void {}`
- 입력: "/sd-readme"
- 체크리스트:
  - [ ] 루트에 README.md 파일이 생성됨
  - [ ] README.md에 @simplysm/pkg-a가 포함됨
  - [ ] README.md에 @simplysm/pkg-b가 포함되지 않음 (private이므로)
  - [ ] README.md에 각 패키지의 description이 포함됨
  - [ ] packages/pkg-a/README.md도 함께 생성됨

### 시나리오 4: 개별 패키지 지정 시 root 미생성
- 사전 조건: 시나리오 3과 동일
- 입력: "/sd-readme pkg-a"
- 체크리스트:
  - [ ] 루트에 README.md 파일이 생성되지 않음
  - [ ] packages/pkg-a/README.md는 생성됨

## 안티패턴 Eval

- [ ] internal(export되지 않은) 모듈을 문서화하지 않는다
- [ ] src/ 전체를 무차별 스캔하지 않는다 (반드시 exports 기반 추적)
- [ ] 소규모 패키지에 불필요한 docs/ 분할을 하지 않는다
- [ ] 존재하지 않는 API를 hallucination으로 생성하지 않는다
- [ ] 개별 패키지 지정 시 root README.md를 생성하지 않는다

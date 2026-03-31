# 디버그: sd-cli dev 실행 시 5개 에러 발생

## 출처

- **origin:** `direct`

## 에러 그룹 요약

| 그룹 | 에러 | 상태 | 선택 방안 |
|------|------|------|----------|
| 1 | `declarationMap` without `declaration` | 확정 | transformer에 `declarationMap: false` 추가 |
| 2 | `contentStyle` not a known property of `sd-list-item` | 확정 | `contentStyle` + `contentClass` input 추가 |
| 3 | `Window` → `Record<string, unknown>` 타입 변환 | 확정 | 소비 프로젝트 문제 (simplysm 무관) |
| 4 | `Content type parser 'application/json' already present` → 서버 크래시 | 확정 | `_startDevMode()` 서버 이중 시작 코드 제거 |
| 5 | `spawn electron-rebuild ENOENT` | 확정 | `_exec`에서 `shell: true` 전달 |

---

## 그룹 1: declarationMap tsconfig 에러

### 에러 증상

- **에러 메시지:** `Option 'declarationMap' cannot be specified without specifying option 'declaration' or option 'composite'.`
- **위치:** `sd:cli:angular` (dev 모드 Angular 타입체크)

### ACH 매트릭스

|    | transformer 코드가 `declaration: false`만 설정 | 라이브러리 빌드(`buildCompilerOptions`)는 4분기 모두 `declarationMap` 명시 |
|----|---|---|
| H1: transformer가 `declarationMap: false` 누락 | C | C |
| H2: AngularCompiler 내부 별도 검증 | N | I → 폐기 |

### 결과: 확정 — H1

`vite-angular-plugin.ts:150-154`의 `compilerOptionsTransformer`가 `declaration: false` 설정 시 `declarationMap: false`를 누락하여, 소비 프로젝트 tsconfig의 `declarationMap: true`가 상속됨.

### 선택 결과

**transformer에 `declarationMap: false` 추가** (평균 9.0/10)

수정 파일: `packages/sd-cli/src/angular/vite-angular-plugin.ts:150-154`

```typescript
compilerOptionsTransformer: (opts) => ({
  ...opts,
  noEmit: false,
  declaration: false,
  declarationMap: false, // 추가
}),
```

---

## 그룹 2: sd-list-item contentStyle 에러

### 에러 증상

- **에러 메시지:** `Can't bind to 'contentStyle' since it isn't a known property of 'sd-list-item'.`
- **위치:** `client-devtool/src/AppPage.ts:56`

### ACH 매트릭스

|    | v14 초기 커밋에 `contentStyle` 없음 | 이전 커밋에도 없음 | 다른 컴포넌트에는 존재 |
|----|---|---|---|
| H1: 이전 버전에서 제거됨 | I → 폐기 | I → 폐기 | N |
| H2: 원래부터 없었음 | C | C | C |

### 결과: 확정 — H2

`contentStyle`는 `sd-list-item`에 원래부터 존재하지 않았음. 다른 컴포넌트(sd-checkbox, sd-select 등)와 일관성을 위해 추가.

### 선택 결과

**`contentStyle` + `contentClass` input 추가** (사용자 요청)

수정 파일: `packages/angular/src/ui/data/list/sd-list-item.control.ts`

- `contentStyle = input<string>()` 추가
- `contentClass = input<string>()` 추가
- 템플릿 `._content` div에 `[style]="contentStyle()"` `[class]="contentClass()"` 적용

---

## 그룹 3: Window 타입 변환 에러

### 에러 증상

- **에러 메시지:** `Conversion of type 'Window & typeof globalThis' to type 'Record<string, unknown>' may be a mistake`
- **위치:** `client-devtool/tests/AppPage.spec.ts:11`

### 결과: 확정

소비 프로젝트(`simplysm-opus`) 테스트 코드 문제. simplysm 라이브러리와 무관. `window as unknown as Record<string, unknown>`으로 수정 필요.

---

## 그룹 4: Fastify content type parser 중복 → 서버 크래시

### 에러 증상

- **에러 메시지:** `Content type parser 'application/json' already present.`
- **위치:** `@fastify/http-proxy/index.js:545` → `service-server.ts`의 Fastify 인스턴스

### 분석 내용

- `service-server.ts:115`에서 `addContentTypeParser("application/json")` 등록
- `@fastify/http-proxy`(`fastify-plugin`으로 non-encapsulated)가 같은 scope에서 parser 등록 시도
- Fastify의 `existingParser()`: default parser는 교체 허용, custom parser는 중복 거부
- v13과 v14 코드 구조 거의 동일, Fastify/http-proxy 라이브러리 코드도 동일
- **v13에서는 에러 없이 동작**하므로 위 분석에 누락된 요소가 있음

### 결과: 확정

`_startDevMode()` line 401-420과 `_onDevBatchComplete()` line 469-477에서 동일 서버에 대해 `_startServerRuntime()`이 2번 호출됨. 두 번째 워커가 이미 parser가 등록된 Fastify 인스턴스에 다시 proxy + listen()을 시도하여 parser 충돌 발생.

### 선택 결과

**`_startDevMode()`의 서버 시작 코드(line 401-420) 제거.** `_onDevBatchComplete()`에서 초기 빌드 + 리빌드 모두 서버 시작을 단일 경로로 처리.

수정 파일: `packages/sd-cli/src/orchestrators/DevWatchOrchestrator.ts`

---

## 그룹 5: electron-rebuild ENOENT

### 에러 증상

- **에러 메시지:** `spawn D:\workspaces-14\simplysm-opus\packages\client-devtool\node_modules\.bin\electron-rebuild ENOENT`
- **위치:** `packages/sd-cli/src/electron/electron.ts:74`

### ACH 매트릭스

|    | `cpx.exec`에서 `shell: false` 기본값 | Windows `.bin/`에 `.cmd` 래퍼 | `execa`는 `cross-spawn`으로 `.cmd` 자동 처리 |
|----|---|---|---|
| H1: `execa` → `cpx.exec` 마이그레이션에서 Windows `.cmd` 처리 누락 | C | C | C |
| H2: 패키지 미설치 | N | N | I → 폐기 |

### 결과: 확정 — H1

v14에서 `execa` → `cpx.exec` 마이그레이션 시, `execa`의 `cross-spawn`이 자동 처리하던 Windows `.cmd` 파일 실행이 누락됨. `cpx.exec`는 `child_process.spawn({ shell: false })`를 사용하여 Windows에서 `.cmd` 래퍼 스크립트를 실행할 수 없음.

### 선택 결과

**`_exec`에서 `shell: true` 전달** (평균 8.0/10)

수정 파일: `packages/sd-cli/src/electron/electron.ts:59`

```typescript
// Before
const { stdout: result } = await cpx.exec(cmd, args, { cwd, env });

// After
const { stdout: result } = await cpx.exec(cmd, args, { cwd, env, shell: true });
```

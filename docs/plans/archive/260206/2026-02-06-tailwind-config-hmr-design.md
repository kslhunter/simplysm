# Tailwind Config HMR - Workspace 패키지 의존성 추적

## 문제

Tailwind CSS v3의 `getModuleDependencies` (`getModuleDependencies.js:92`)가 `if (!match[1].startsWith(".")) continue;`로 비-상대 경로를 무시한다. `@simplysm/solid/tailwind.config` 같은 패키지 경로가 의존성으로 등록되지 않아, dev 모드에서 해당 파일 변경 시 HMR이 동작하지 않는다.

## 해결

Tailwind과 동일한 import 파싱 로직에 scope 패키지 resolve를 추가한 유틸리티 함수를 만들고, Vite 플러그인에서 의존성을 watch하여 변경 시 Tailwind 캐시 무효화 + full-reload를 트리거한다.

## 유틸리티 함수: `getTailwindConfigDeps`

**파일:** `packages/cli/src/utils/tailwind-config-deps.ts`

```
getTailwindConfigDeps(configPath, scopes) → string[]
```

- `configPath`: tailwind config 파일 경로
- `scopes`: 추적할 패키지 scope 배열 (예: `["@simplysm", "@myapp"]`)

**동작:**

1. config 파일을 읽어 import/require 문을 정규식으로 파싱
2. 상대 경로(`./`, `../`): Tailwind과 동일하게 파일시스템에서 resolve
3. scope 패키지 경로 (예: `@simplysm/solid/tailwind.config`): `node_modules`에서 패키지 디렉토리를 찾고 → `fs.realpathSync`로 symlink를 풀어 실제 경로 반환
4. resolve된 파일에 대해 재귀적으로 1~3 반복
5. 그 외 패키지 (`tailwindcss/colors` 등): 무시

**반환값:** 추적된 모든 파일의 절대 경로 배열 (config 자신 포함)

## Vite 플러그인: `sdTailwindConfigDepsPlugin`

**파일:** `packages/cli/src/utils/vite-config.ts` (기존 파일에 추가)

**scope 결정 로직:**

- `pkgDir/package.json`의 `name`에서 scope 추출 (예: `@simplysm/solid-demo` → `@simplysm`)
- `@simplysm`은 항상 포함
- 두 scope를 Set으로 합쳐서 중복 제거 후 `getTailwindConfigDeps`에 전달

**플러그인 동작 (`configureServer` 훅):**

1. `pkgDir/tailwind.config.ts` 존재 여부 확인
2. `getTailwindConfigDeps`로 전체 의존성 수집
3. config 자신을 제외한 외부 의존성을 `server.watcher.add()`로 등록
4. `watcher.on("change")` 이벤트에서:
   - 변경된 파일이 외부 의존성 목록에 있으면
   - `fs.utimesSync`로 config의 mtime을 touch (Tailwind 내부 캐시 무효화)
   - `server.ws.send({ type: "full-reload" })` 트리거

**touch가 필요한 이유:**
Tailwind의 `setupTrackingContext.js`가 config 의존성 목록(상대 경로만 포함된)의 mtime으로 캐시 여부를 판단한다. Vite가 CSS를 재처리해도, config 파일의 mtime이 안 바뀌면 Tailwind이 이전 config를 계속 사용한다. touch로 mtime을 갱신하면 Tailwind이 config를 다시 로드하고, 이때 `@simplysm/` import도 새로 평가된다.

## 테스트

**파일:** `packages/cli/tests/tailwind-config-deps.spec.ts`

1. `solid-demo/tailwind.config.ts`의 의존성에 `solid/tailwind.config.ts`가 포함되는지
2. config 자신도 의존성에 포함되는지
3. `@simplysm/` 이외 패키지(`tailwindcss/colors` 등)는 포함하지 않는지

## 변경 파일

- **Create:** `packages/cli/src/utils/tailwind-config-deps.ts`
- **Create:** `packages/cli/tests/tailwind-config-deps.spec.ts`
- **Modify:** `packages/cli/src/utils/vite-config.ts`

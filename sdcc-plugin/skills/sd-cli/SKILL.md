---
name: sd-cli
description: "@simplysm/sd-cli(모노레포 빌드·watch·dev·배포 CLI, sd.config.ts 설정 타입, SdTsCompiler, Vitest 용 sdAngularPlugin)와 @simplysm/lint(ESLint 권장 설정·커스텀 규칙)의 사용 안내. Use when sd.config.ts 를 작성·해석하거나, 프로젝트의 검사·빌드·배포 명령을 문서화·실행하거나, eslint 설정·lint 오류를 다루거나, 새 워크스페이스·패키지를 만드는 모든 작업 — 착수 전에 먼저 읽는다. 명령을 안다고 생각해도 읽는다(설치된 버전의 명령·-t 값 규칙이 학습 지식과 다르다). 대상: sd-cli check·build·watch·dev·device·publish·replace-deps·init, SdConfig·SdPackageConfig(target node/browser/neutral/client/server/scripts), prerender·capacitor·electron·pwa 설정, eslint-recommended, @simplysm/* 커스텀 규칙."
---

@simplysm/sd-cli 와 @simplysm/lint 사용 안내입니다. 상세 동작은 설치된 소스에서 직접 확인합니다 — 이 문서는 명령·설정 스키마와, 소스 한 파일만 읽어서는 놓치는 규칙만 담습니다.

## 소스 위치

- `node_modules/@simplysm/sd-cli/src/` — 명령 정의 `sd-cli-entry.ts`, 설정 타입 `sd-config.types.ts`, 컴파일러 `ts-compiler/`, `angular/vite-angular-plugin.ts`. 공개 API(`src/index.ts`)는 설정 타입·`sdAngularPlugin`·`SdTsCompiler` 뿐이고 나머지는 CLI 내부.
- `node_modules/@simplysm/lint/src/` — `eslint-recommended.ts`(flat config 배열), `eslint-plugin.ts`(커스텀 규칙 9종), `rules/`. entry 는 `@simplysm/lint/eslint-recommended`, `@simplysm/lint/eslint-plugin` 둘뿐(`exports` 맵).

## 명령

`sd-cli <command> [-t <target>...] [-o <opt>...]`. 프로젝트 `package.json` scripts 가 감싸는 게 보통이므로 실제 이름은 그 scripts 를 읽습니다.

| 명령 | 무엇 |
| --- | --- |
| `check` | typecheck·lint 병렬(test 는 포함되지 않음 — vitest 는 별도). `--type typecheck` / `--type lint` 로 개별, `--fix` 로 자동 수정 |
| `watch` / `build` | 패키지 빌드(watch 모드 / 프로덕션) |
| `dev` | server 패키지 dev 실행(연결된 client 개발 서버 포함) |
| `device` | client 를 기기·데스크톱(Capacitor/Electron)에서 실행 |
| `publish` | 빌드 후 배포(`--no-build` 로 빌드 생략) |
| `replace-deps` | `sd.config.ts` `replaceDeps` 대로 node_modules 를 로컬 소스 심링크로 교체 |
| `init [kind]` | 새 워크스페이스 부트스트랩(`init client` 는 기존 워크스페이스에 client 패키지 추가) |

- `check`(및 이를 `--type` 으로 감싼 `typecheck`/`lint` 스크립트)의 `-t` 는 `packages/*`·`tests/*` 의 **디렉터리명**(예 `core-common`). `build`·`watch`·`dev`·`device`·`publish` 의 `-t` 는 `sd.config.ts` `packages` 의 **키**(`@simplysm/` 접두사 없음). `replace-deps` 는 `-t` 가 없습니다. `-o` 값은 `sd.config.ts` 함수의 `opt` 로 전달.
- 소비 프로젝트의 `CLAUDE.md` 에 검증 명령을 적을 때는 `pnpm check --fix` 를 기본으로 두고 `typecheck`/`lint` 단독 실행은 문제 분석용 보조로만 표기합니다. `-t` 예시는 짧은 이름으로.

## sd.config.ts

- default export 는 `SdConfigFn = (params: { cwd, dev, opt }) => SdConfig | Promise<SdConfig>`. `packages` 의 key 는 `packages/` 하위 디렉터리명, 값이 `undefined` 면 비활성.
- `target` 으로 설정 종류가 갈립니다: `"node" | "browser" | "neutral"`(라이브러리, `publish`/`copySrc`/`watch` 훅), `"client"`(`server`, `env`, `capacitor`, `electron`, `configs`, `browserSupport`, `pwa`, `prerender`), `"server"`(`env`, `configs`, `externals`, `pm2`, `packageManager`), `"scripts"`.
- `client.server` 는 서버 패키지 **디렉터리명**(문자열). 숫자 포트는 하위 호환용.
- `configs` 는 빌드 시 `dist/.config.json` 으로 기록되어 런타임(`ServiceContext.getConfig`)이 읽습니다. `env` 는 `process.env.KEY` 를 빌드 시 상수 치환.
- `prerender: ["/", …]` 가 SSG(`/` 로 시작하는 고정 라우트만, dev/watch 미적용). 화면 쪽 제약은 `angular` 스킬.
- `replaceDeps: { "@simplysm/*": "../simplysm/packages/*" }` — key 의 `*` 캡처가 value 에 치환. 설치된(`.js`) CLI 는 명령 실행 전에 자동 적용하고(`init`·`replace-deps` 제외), 소스(`.ts`) 실행에는 이 사전 단계가 없습니다.
- `publish` 는 `{ type: "npm" }` / `{ type: "local-directory", path }` / `{ type: "ftp"|"ftps"|"sftp", host, … }`. `path`·`postPublish.args` 에 `%VER%`·`%PROJECT%` 치환.

## lint

- `eslint.config.ts` 는 `import config from "@simplysm/lint/eslint-recommended"; export default config;` 가 기본, 조정은 뒤에 블록 추가. type-aware(`parserOptions.project: true`)라 `tsconfig.json` paths 가 맞아야 합니다.
- 켜져 있는 것 중 자주 걸리는 규칙: `no-console`(테스트 폴더 제외), `Buffer`/`buffer`/`events` 금지, `process.env`·`import.meta.env` 직접 접근 금지(→ `env()`), `=== undefined` 금지(→ `== null`), private 멤버 `_` 접두 필수, `#private` 금지(`@simplysm/no-hard-private`), `@simplysm/*/src/...` 서브패스 import 금지, `effect(async …)` 금지(`@simplysm/ng-no-async-effect`), 미사용 `inject()` 필드·컴포넌트 `protected readonly` 필드 제거(autofix), `require-await`/`no-floating-promises`/`strict-boolean-expressions`(nullable boolean·object 허용).
- 템플릿: `$any` 금지(`@angular-eslint/template/no-any`) — 타입 오류는 컴포넌트 타입 설계를 고쳐 풀고 `eslint-disable` 로 우회하지 않습니다. `=== null`/`=== undefined` 금지(→ `== null`), `sd-*` 컴포넌트의 plain attribute 는 `[attr]="…"` 바인딩으로(`id`/`class`/`style`/`title`/`tabindex`/`role`, `aria-`/`data-`/`sd-` 접두는 허용).

## 소스 한 파일만 읽어서는 틀리기 쉬운 것

- `sdAngularPlugin({ pkg })` 는 Vitest 전용 Vite 플러그인(`process.cwd()/packages/<pkg>` 를 AOT 컴파일). dev 서버·프로덕션 빌드용이 아니며 tsconfig 에 `angularCompilerOptions` 가 없으면 일반 TS 컴파일로 폴백.
- `SdTsCompiler` 는 `output: { js, dts }` 조합으로 emit/declaration-only/noEmit 이 갈리고, `env: "node"|"browser"` 가 lib·@types 를 바꿉니다. 단계별 크래시는 진단으로 흡수되어 `errorCount` 에 합산됩니다.
- 설치된(`.js`) CLI 는 `replaceDeps` 사전 적용 뒤 새 프로세스로 실제 CLI 를 띄웁니다. `init` 은 빈 디렉터리에서 실행되므로 `sd.config.ts` 사전 로드 자체를 건너뜁니다.
- Capacitor `sign` 의 keystore·`icon` 경로는 패키지 기준 상대 경로. `plugins` 는 `{ "패키지명": 옵션 | true }`.

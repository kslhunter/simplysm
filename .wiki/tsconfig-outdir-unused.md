---
summary: 패키지 tsconfig 에 outDir/rootDir 을 넣을지, sd-cli 빌드 출력 경로가 어디서 정해지는지 궁금할 때.
title: 패키지 tsconfig 의 outDir 은 sd-cli 가 읽지 않는다
---

# 패키지 tsconfig 의 outDir 은 sd-cli 가 읽지 않는다

sd-cli 는 tsconfig 를 `utils/tsconfig.ts#parseTsconfig` 1곳에서만 파싱하고, 출력 경로는 전부 코드로 하드코딩한다:

- `SdTsCompiler._buildCompilerOptions`: `options.outDir = path.join(pkgDir, "dist")` 로 무조건 덮어씀. dts 도 `declarationDir = pkgDir/dist` 코드 지정.
- `server-build.worker`·`server-watch-manager`: `pkgDir/dist`, `dist/main.js` 하드코딩.
- client(esbuild) outdir: sd.config/코드에서 결정 (capacitor 는 `.capacitor/www`).
- `typecheck-non-package`: noEmit — outDir 무관.

따라서 `packages/*/tsconfig.json` 에 `"outDir": "./dist"` 를 넣어도 읽히지 않는다. TS6 의 "rootDir must be explicitly set" 진단(모노레포 paths 소스 직참조라 공통 소스 디렉터리가 `..` — rootDir `./src` 는 TS6059 로 불가) 때문에 2026-07 에 전 패키지에서 outDir 을 제거했고, 제거 전후 `pnpm build` dist 산출(angular 399파일·core-common 144파일, .d.ts 포함)이 경로+크기 완전 동일함을 실측 확인. 전체 build/check 0 에러.

paths 로 타 패키지 소스가 rootDir 추론(`packages/`)에 섞여 출력이 `dist/{pkg}/src/` 로 중첩되는 문제는 `utils/output-path-rewriter.ts` 가 평면화한다.

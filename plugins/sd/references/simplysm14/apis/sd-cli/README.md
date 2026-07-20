# @simplysm/sd-cli

프로젝트 루트 `sd.config.ts` 설정 타입, 패키지 단위 TypeScript, Angular AOT 컴파일 API, Vitest 플러그인.

## 사용 트리거 인덱스

- **Configuration Types** — sd.config.ts 작성 시 패키지별 빌드, 배포, 클라이언트/서버 설정 정의. 자세히: [sd-config-types.md](./sd-config-types.md)
- **SdTsCompiler** — 패키지 단위 TypeScript 및 Angular AOT 컴파일 실행. 자세히: [SdTsCompiler.md](./SdTsCompiler.md)
- **sdAngularPlugin** — Vitest 환경에서 Angular 테스트 시 AOT 컴파일.

## sdAngularPlugin

Angular AOT 컴파일을 수행하는 Vite 플러그인 (Vitest 전용). SdTsCompiler 로 패키지 `.ts` 파일을 AOT 컴파일하고, transform 훅에서 컴파일된 JS 를 반환.

```typescript
function sdAngularPlugin(options: SdAngularPluginOptions): Plugin;
```

- `options.pkg`: string — 대상 패키지 디렉토리명 (sd.config.ts packages 키. 예: "core-browser"). process.cwd()/packages/<pkg> 로 해석됨.

### 훅 동작

- `config()`: 패키지 디렉토리 경로 확정.
- `watchChange(id)`: 변경 파일 경로 수집 (posix 형식). 다음 buildStart 호출 시 modifiedFiles 로 전달.
- `buildStart()`: SdTsCompiler 생성 (또는 재사용), compileAsync(modifiedFiles) 실행, emit 결과 → 소스 경로 맵.
  - 이미 초기화되고 변경 없으면 재컴파일 건너뜀.
  - 진단, SCSS 에러는 logger 보고.
- `transform(_code, id)`: query 제거 후 `.ts` 경로가 emit 맵에 있으면 컴파일된 JS 반환 ({ code, map } 또는 { code, map: null }). 없으면 undefined (패스).
- `buildEnd()`: SdTsCompiler 참조 정리. 다음 빌드 사이클에서 재생성.

### 주의사항

- Vitest 전용. dev 서버나 프로덕션 빌드용 아님.
- Angular 필수: tsconfig.json 에 angularCompilerOptions 이 없으면 일반 TS 컴파일로 폴백.
- watch 모드: modifiedFiles 증분 컴파일 최적화.
- enforce: "pre" — 다른 플러그인 전에 .ts 변환 실행.
- 테스트 작성 가이드: [test.md](../../manuals/test.md)

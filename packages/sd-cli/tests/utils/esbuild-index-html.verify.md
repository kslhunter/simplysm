# esbuild-index-html — LLM 검증

## 검증 항목

- [x] FileInfo 타입이 IndexHtmlGenerator의 FileInfo와 호환: IndexHtmlGeneratorProcessOptions.files는 `{file: string, name?: string, extension: string}` — 동일 구조 확인
- [x] entrypoints 타입이 IndexHtmlGenerator의 Entrypoint와 호환: `[string, boolean][]` — `Entrypoint = [name: string, isModule: boolean]`과 동일
- [x] SRI 옵션이 mode에 따라 정확히 설정: `sri: options.mode === "build"` — build일 때만 true
- [x] cssBundle 연결 로직의 정확성: JS entry의 `output.cssBundle` 경로를 normalize하여 CSS output의 경로와 매칭. esbuild metafile 구조상 cssBundle은 output key와 동일 형식
- [x] postTransform이 IndexHtmlGeneratorOptions에 올바르게 전달: `IndexHtmlTransform = (content: string) => Promise<string>` — GenerateIndexHtmlOptions.postTransform과 동일 타입
- [x] Windows 경로 호환성: `replace(/\\/g, "/")` 로 모든 경로를 POSIX 형식으로 정규화

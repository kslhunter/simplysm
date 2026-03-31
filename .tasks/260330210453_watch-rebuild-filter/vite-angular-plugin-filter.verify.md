# vite-angular-plugin.ts handleHotUpdate 필터 - LLM 검증

## 검증 항목
- [x] 확장자 필터(.ts/.tsx/.html/.scss) 통과 후 program 멤버십 확인이 수행되는가: line 227-236, 확장자 필터(line 218-225) 이후 program 체크
- [x] normalizePath로 파일 경로를 정규화하여 비교하는가: line 228 `normalizePath(file)`, line 231 `normalizePath(sf.fileName)`
- [x] program에 미포함 시 onBuildStart 호출 없이 return하는가: line 233-236, `!isInProgram` → `return` (onBuildStart는 line 246에서 호출되므로 도달하지 않음)
- [x] program에 포함 시 기존 흐름(hmrLock → onBuildStart → compiler.update)이 정상 동작하는가: line 238-246, isInProgram=true면 필터를 통과하여 기존 로직 실행
- [x] 건너뛸 때 debug 로그가 출력되는가: line 234, `logger.debug`
- [x] hmrLock 획득 전에 필터링이 수행되는가 (불필요한 대기 방지): line 227-236이 line 238-244(hmrLock) 이전에 위치

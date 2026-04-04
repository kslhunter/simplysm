# ngtsc-build.worker.ts 의존성 필터 - LLM 검증

## 검증 항목
- [x] extractSourceFilePaths가 compiler.getTsProgram()의 source files를 정규화(\\→/)하여 Set으로 반환하는가: line 95-100, `sf.fileName.replace(/\\/g, "/")` 사용
- [x] 초기 빌드(compiler.initialize) 후 lastSourceFilePaths가 설정되는가: line 214, `lastSourceFilePaths = extractSourceFilePaths(compiler.getTsProgram())`
- [x] onChange에서 add/unlink 이벤트 시 필터를 우회하고 항상 buildStart를 발행하는가: line 245-247, `hasFileAddOrRemove` 체크 후 line 268 조건문에서 `!hasFileAddOrRemove`가 false면 필터 건너뜀
- [x] onChange에서 change 이벤트 시 modifiedFiles(SCSS 역추적 포함)가 lastSourceFilePaths에 포함되지 않으면 buildStart 없이 건너뛰는가: line 268-276, `hasRelevantChange` false시 return
- [x] 건너뛸 때 debug 로그 "변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀"을 출력하는가: line 273
- [x] 리빌드 후 lastSourceFilePaths가 갱신되는가: line 288, `lastSourceFilePaths = extractSourceFilePaths(compiler.getTsProgram())`
- [x] cleanup에서 lastSourceFilePaths가 undefined로 초기화되는가: line 53
- [x] SCSS 역추적으로 추가된 .ts 파일도 필터에서 고려되는가: line 250-265에서 modifiedFiles에 SCSS 역추적 결과(.ts containing files)가 추가되고, line 269에서 modifiedFiles 전체를 lastSourceFilePaths와 비교

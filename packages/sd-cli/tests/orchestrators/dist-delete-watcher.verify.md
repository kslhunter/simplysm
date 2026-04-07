# dist 삭제 감지 watcher 일반화 -- LLM 검증

## 검증 항목

- [x] 디버그 하드코딩 제거: `DevWatchOrchestrator.ts:281` — `angular` 하드코딩 블록이 제거됨
- [x] 모든 라이브러리 패키지 감시: `_startWatchMode()`에서 `this._libraryPackages`를 순회하며 각 `pkg.dir/dist`를 감시
- [x] 클래스 필드 저장: `_distDeleteWatchers: FsWatcher[]` 필드에 push
- [x] shutdown() 정리: `shutdown()`에서 `this._distDeleteWatchers.map(w => w.close())` 호출 확인
- [x] 정리 후 초기화: `this._distDeleteWatchers = []`로 참조 해제 확인
- [x] 로그 형식: `[dist-delete:{패키지명}]` 형식으로 어떤 패키지의 dist가 삭제되었는지 식별 가능

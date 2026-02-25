# Server Dev Watch + Metafile Filtering Design

## Problem

Server dev mode (`pnpm dev`)에서 workspace 의존성 패키지(예: db-main)의 source가 변경되어도 server가 감지하지 못해 rebuild/재시작이 안 됨.

기존에는 `@scope/*/dist`만 감시했으나, tsconfig.paths로 source를 직접 참조하는 구조에서는 dist가 변경되지 않으므로 무의미.

## Solution: FsWatcher + Metafile Filtering (B 방안)

기존 FsWatcher 구조를 유지하되:
- Watch 범위를 넓게 확장
- esbuild `metafile.inputs`로 실제 빌드에 포함된 파일만 필터링하여 불필요한 rebuild 방지

## Watch Paths (6개)

```
# workspace 패키지
packages/*/src/**/*
packages/*/*.{ts,js,css}

# @simplysm 라이브러리 (루트 node_modules)
node_modules/@simplysm/*/dist/**/*.js
node_modules/@simplysm/*/*.{ts,js,css}

# @simplysm 라이브러리 (현재 패키지 node_modules, hoisting 안 된 경우)
packages/{현재패키지}/node_modules/@simplysm/*/dist/**/*.js
packages/{현재패키지}/node_modules/@simplysm/*/*.{ts,js,css}
```

기존 scope dist 감시 코드(462-474행) 제거, 위 경로로 대체.

## onChange Logic

```
onChange({ delay: 300 }, async (changes) => {
  1) 파일 추가/삭제 감지 (watch 전체 범위)
     → context 재생성 (entryPoints + import graph 변경 가능)
     → metafile도 갱신됨

  2) 파일 변경만 있는 경우
     → 변경된 파일 경로를 pathNorm으로 정규화
     → metafile.inputs의 키를 절대경로로 변환하여 비교
     → 하나라도 metafile.inputs에 있으면 context.rebuild()
     → 없으면 skip

  3) metafile이 아직 없으면 (첫 빌드 전)
     → 무조건 rebuild fallback

  4) rebuild 후 output 변경 여부 확인
     → 변경 없으면 build 이벤트 미발생 (서버 재시작 스킵)
})
```

## Output Change Detection

- esbuild `write: false`로 설정하여 outputFiles를 메모리에 받음
- 기존 `writeChangedOutputFiles` 함수(esbuild-config.ts:16-41)로 디스크 기존 파일과 비교
- 실제 변경된 파일이 있을 때만 `build` 이벤트 emit → 서버 재시작

## Metafile Storage

- `createAndBuildContext`에서 `metafile: true` 추가
- 모듈 레벨 변수 `let lastMetafile: esbuild.Metafile | undefined`
- onEnd 플러그인에서 `result.metafile`을 저장, rebuild마다 갱신

## Path Normalization

- FsWatcher: `pathNorm()` → `path.resolve()` → 절대 경로
- esbuild metafile.inputs: 상대 경로
- 비교 시 metafile.inputs 키를 `pathNorm(cwd, key)`로 변환하여 통일

## Modified Files

| File | Changes |
|------|---------|
| `server.worker.ts` | watch 경로 6개로 교체, onChange에 metafile 필터링 추가, 파일 추가/삭제 범위 확장, `createAndBuildContext`에 `metafile: true` + `write: false`, `lastMetafile` 변수, onEnd에서 metafile 저장 + output 변경 감지 |

`esbuild-config.ts`, `FsWatcher`, `DevOrchestrator` 등은 변경 없음.

## Scope

- server.worker.ts만 (client는 Vite가 자체 처리, 추후 필요 시 별도 대응)

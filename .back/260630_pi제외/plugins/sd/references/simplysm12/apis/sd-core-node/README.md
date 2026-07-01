# @simplysm/sd-core-node

Node.js 전용 코어 유틸: 파일시스템(동기/비동기) 래퍼, 경로 정규화, 해시, 파일 감시, 로깅, 자식 프로세스 실행, 워커 스레드 통신. 모든 export 는 `static` 메서드 클래스이거나 워커용 함수/타입. import 시 `@simplysm/sd-core-common` 이 부수효과로 로드된다(배열·Map prototype 확장 등 의존).

## 사용 트리거 인덱스

- **FsUtils** — 파일/디렉토리 읽기·쓰기·복사·삭제·glob·stat·JSON 입출력이 필요할 때. 모든 메서드는 실패 시 경로를 첨부한 `SdError` throw. 동기/비동기 쌍으로 제공.
- **PathUtils** — OS 무관 경로 정규화(`TNormPath`), posix 슬래시 변환, 디렉토리 기준 경로 재배치, 부모/자식 판정이 필요할 때.
- **HashUtils** — 문자열/버퍼의 sha256 해시(hex)가 필요할 때. `FsUtils.writeFilesAsync` 의 변경감지에 사용.
- **SdFsWatcher** — 파일 변경(add/change/unlink 등)을 디바운스해 일괄 콜백받고 싶을 때. chokidar 래퍼.
- **SdLogger / SdLoggerSeverity / SdLoggerStyle** — 그룹별 콘솔/파일 로깅, 레벨·색상·파일분할이 필요할 때.
- **SdProcess** — 외부 명령(`cmd args[]`)을 spawn 해 stdout/stderr 를 모아 반환받고 싶을 때.
- **워커(SdWorker / createSdWorker / 타입들)** — worker_threads 로 타입세이프 RPC(메서드 호출 + 이벤트 송신)를 구성할 때. 자세히: [worker.md](./worker.md)

## FsUtils

정적 클래스. `targetPath`/`sourcePath` 는 모두 일반 string 경로. 대부분 메서드가 try/catch 후 `new SdError(err, path)` 로 재throw 한다.

- `getParentPaths(currentPath: string): string[]` — `currentPath` 의 모든 상위 디렉토리를 루트까지 배열로. 자기 자신 미포함.
- `getMd5Async(filePath: string): Promise<string>` — 파일 스트림의 md5 hex. 큰 파일용(스트리밍).
- `globAsync(pattern, options?: glob.GlobOptions): Promise<string[]>` / `glob(...)` — glob 매칭. 패턴의 `\` 를 `/` 로 치환 후 매칭, 결과는 `path.resolve` 한 절대경로. options 미지정 시 `{}`.
- `readdirAsync(targetPath): Promise<string[]>` / `readdir(...)` — 디렉토리 한 단계 항목명 목록.
- `exists(targetPath): boolean` — 존재 여부(동기). 에러 시 SdError throw.
- `removeAsync(targetPath): Promise<void>` / `remove(...)` — 재귀 삭제. async 판: `recursive:true, force:true, retryDelay:500, maxRetries:6`(락 재시도). sync 판은 재시도 없음.
- `copyAsync(sourcePath, targetPath, filter?: (subPath)=>boolean): Promise<void>` / `copy(...)` — 재귀 복사. source 없으면 무동작. 디렉토리면 자식별로 재귀(async 는 `parallelAsync` 병렬). `filter` 가 false 반환하는 항목은 건너뜀.
- `mkdirsAsync(targetPath): Promise<void>` / `mkdirs(...)` — 재귀 디렉토리 생성. 이미 있으면 무동작.
- `writeJsonAsync(targetPath, data, options?)` / `writeJson(...)` — `JsonConvert.stringify(data, options)` 후 파일쓰기. options: `replacer?` JSON 치환 함수, `space?` 들여쓰기(문자/숫자).
- `writeFilesAsync(files: {path: TNormPath; data: string|Buffer; prevHash?: string; hash?: string}[]): Promise<{path; hash}[]>` — 다건 쓰기. 파일명(basename) 기준 그룹을 병렬, 그룹 내 순차(폴더 메타 락 회피). `hash` 미지정 시 `HashUtils.get(data)` 로 계산. `prevHash !== hash` 인 파일만 실제로 쓰고 결과 배열에 포함(변경분만 반환).
- `writeFileAsync(targetPath, data)` / `writeFile(...)` — 상위 디렉토리 자동 생성 후 쓰기. sync 판은 `flush:true`.
- `readFile(targetPath): string` / `readFileAsync(...)` — utf-8 문자열 읽기. async 판은 없으면 "파일을 찾을 수 없습니다" SdError.
- `readFileBuffer(targetPath): Buffer` / `readFileBufferAsync(...)` — 바이너리 버퍼 읽기.
- `readJson(targetPath): any` / `readJsonAsync(...)` — 읽어서 `JsonConvert.parse`. async 판은 파싱 실패 시 경로+내용 첨부 SdError.
- `lstat / lstatAsync / stat / statAsync (targetPath): fs.Stats` — 파일 메타. lstat 은 심볼릭링크 자체, stat 은 대상.
- `appendFile(targetPath, data): void` — utf8 추가쓰기(동기).
- `open(targetPath, flags: string|number): number` / `openAsync(...): Promise<fs.promises.FileHandle>` — 파일 디스크립터/핸들 열기. flags 는 `"r"`,`"w"` 등.
- `createReadStream(sourcePath): fs.ReadStream` / `createWriteStream(targetPath): fs.WriteStream` — 스트림 생성.
- `clearEmptyDirectoryAsync(dirPath): Promise<void>` — 하위까지 재귀로 빈 디렉토리 제거. dirPath 자신도 비면 삭제.
- `findAllParentChildPaths(childGlob, fromPath, rootPath?): string[]` / `...Async(...)` — `fromPath` 부터 상위로 올라가며 각 단계에서 `childGlob` 매칭+존재하는 경로 수집. `rootPath` 도달 시 또는 더 못 올라가면 중단. 상위 폴더의 설정파일(예: package.json) 탐색용.

## PathUtils

정적 클래스. `TNormPath` 는 브랜드된 string 타입(`norm` 의 반환). 일반 string 을 TNormPath 자리에 넣으려면 `PathUtils.norm` 을 거쳐야 한다.

- `posix(...args: string[]): string` — `path.join` 후 `\` → `/` 치환. URL/glob 등 posix 슬래시가 필요한 곳에.
- `changeFileDirectory(filePath, fromDirectory, toDirectory): string` — `filePath` 가 `fromDirectory` 하위라는 전제로 `toDirectory` 기준 경로로 재배치. `filePath === fromDirectory` 면 `toDirectory` 반환. 하위가 아니면 Error throw(빌드 산출물 경로 변환 등).
- `removeExt(filePath): string` — 확장자 제거한 basename(디렉토리 경로 미포함).
- `isChildPath(childPath, parentPath): boolean` — 둘을 `norm` 정규화 후 `childPath` 가 `parentPath` 문자열로 시작하는지(접두 비교).
- `norm(...paths: string[]): TNormPath` — 경로 정규화. 첫 인자 선행 `/` 제거 후 `path.resolve`. 결과를 비교/키로 쓰면 OS·슬래시 차이 제거.

## HashUtils

- `get(data: string | Buffer): string` — sha256 hex 다이제스트. 결정적 콘텐츠 해시(파일 변경감지·캐시 키)용.

## SdFsWatcher

chokidar 래퍼. 생성자는 private — 반드시 `watchAsync` 로 진입.

- `static watchAsync(paths: string[], options?: chokidar.ChokidarOptions): Promise<SdFsWatcher>` — 워처 생성 후 chokidar `ready` 이벤트에서 resolve. 내부 watch 는 항상 `persistent:true, ignoreInitial:true` 강제(options 로 덮어도 `ignoreInitial` 은 true 로 고정). 단, `options.ignoreInitial` 값은 별도 보관되어 아래 onChange 의 초기콜백 여부에 쓰임.
- `onChange(opt: { delay?: number }, cb: (changeInfos: ISdFsWatcherChangeInfo[]) => void | Promise<void>): this` — 변경 구독. `delay` 로 `SdAsyncFnDebounceQueue` 디바운스. `add/addDir/change/unlink/unlinkDir` 만 수집하고 동일 경로의 add→change 는 add 로, add→unlink(및 addDir→unlinkDir)는 상쇄(맵에서 제거)하여 노이즈 제거. 보관된 `ignoreInitial` 이 false 면 구독 즉시 빈 배열로 1회 콜백.
- `close(): Promise<void>` — 워처 종료.
- `interface ISdFsWatcherChangeInfo { event: "add"|"addDir"|"change"|"unlink"|"unlinkDir"; path: TNormPath }` — 콜백으로 받는 변경 정보. `path` 는 `PathUtils.norm` 정규화된 경로.

## SdLogger

그룹 기반 로거. 생성자 private — `SdLogger.get(group)` 로 인스턴스 획득. 설정은 `SdLogger.configs`(그룹키별)에 누적되며, 인스턴스는 자기 그룹의 prefix 경로 설정을 순서대로 `ObjectUtils.merge` 해 최종 config 산출.

- `static get(group: string[] = []): SdLogger` — 해당 그룹의 로거 인스턴스. group 은 `["simplysm","sd-cli",...]` 식 계층.
- `static setConfig(group: string[], config: DeepPartial<ISdLoggerConfig>): void` / `setConfig(config): void` — 그룹별(또는 전역) 설정 등록. 키는 `group.join("_")`.
- `static restoreConfig(): void` — 등록 설정 전체 초기화(`configs.clear`).
- `static setHistoryLength(len: number): void` — `history` 보관 최대 개수. 0 이면 history 미적재(기본 0).
- `static history: ISdLoggerHistory[]` — `setHistoryLength(>0)` 시 최근 로그 누적(초과분 앞에서 제거).
- `debug / log / info / warn / error (...args: any[]): void` — 각 severity 로 기록. Error 인자는 `.stack` 으로 출력.

동작(코드 기준): severity 인덱스가 console.level 이상이면 콘솔 출력(미만이면서 `dot:true` 면 `.` 한 글자 출력). file.level 이상이면 `outDir/yyyyMMdd/<seq>.log` 에 기록 — 파일이 `maxBytes` 초과면 seq 증가(파일 분할). `customFn` 있으면 함께 호출(Promise 실패는 콘솔 경고). 기본 config: `dot:false`, console.level=`log`, file.level=`none`(=파일 미기록), file.outDir=`cwd/_logs`, file.maxBytes=`300*1000`(설정 누락 시 분할 판정엔 `500*1000` 사용).

- `interface ISdLoggerConfig` — `dot: boolean`(콘솔 레벨 미달 로그를 점으로 표시) · `console: { style: SdLoggerStyle(그룹 라벨 색), level: SdLoggerSeverity(콘솔 출력 최소 레벨), styles: {debug,log,info,warn,error: SdLoggerStyle}(레벨별 색) }` · `file: { level: SdLoggerSeverity(파일 기록 최소 레벨), outDir: string, maxBytes?: number(파일 분할 임계 바이트) }` · `customFn?: (severity, logs[]) => void|Promise<void>`(외부 전송 등 커스텀 싱크).
- `interface ISdLoggerHistory { datetime: DateTime; group: string[]; severity: SdLoggerSeverity; logs: any[] }` — history 항목.
- `enum SdLoggerSeverity` — `debug`,`log`,`info`,`warn`,`error`,`none`(`none=""`). 값 순서가 레벨 비교 기준(뒤일수록 높음). `none` 을 level 로 두면 그 싱크 사실상 비활성.
- `type TSdLoggerSeverity` — `SdLoggerSeverity` 키에서 `"none"` 제외(실제 기록 가능한 severity 만).
- `enum SdLoggerStyle` — ANSI 코드 모음: `clear` 리셋, `fg*`(Gray/Black/White/Red/Green/Yellow/Blue/Magenta/Cyan) 전경색, `bg*`(Black/Red/Green/Yellow/Blue/Magenta/White) 배경색. console.style/styles 에 지정.

## SdProcess

- `static spawnAsync(cmd: string, args: string[], options?): Promise<string>` — `child_process.spawn(cmd, args)` 실행, stdin 즉시 종료. stdout+stderr 을 한 버퍼에 누적해 종료 시 문자열 반환. exit code 가 0 이 아니면 명령문+code+메시지로 Error reject, spawn 자체 error 도 reject. cwd 기본 `process.cwd()`, env 는 `process.env` 에 `options.env` 병합.
  - options 는 `cp.SpawnOptionsWithoutStdio` + 다음 확장:
    - `messageConvert?: (buffer: Buffer) => string` — 누적 버퍼를 반환 문자열로 변환(인코딩 변환 등). 미지정 시 `buffer.toString()`.
    - `showMessage?: boolean | ((message: string) => void)` — 출력 실시간 표시. 함수면 청크 문자열을 그 함수로, `true` 면 stdout/stderr 로 그대로 전달, falsy 면 표시 안 함(버퍼에는 항상 누적).

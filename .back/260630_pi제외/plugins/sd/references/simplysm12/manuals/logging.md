# 콘솔/구조화 로깅 작성

서버·워커·CLI 같은 Node 진입점에서 콘솔 출력, 파일 출력, 외부(DB) 적재를 한 곳에서 관리하려면 `@simplysm/sd-core-node` 의 `SdLogger` 를 쓴다. `console.log` 를 직접 호출하지 않고 `SdLogger.get([...])` 로 얻은 로거를 통해 기록하면, 진입점에서 정한 설정(레벨·파일경로·외부적재)에 따라 같은 코드가 개발/운영에서 다르게 동작한다.

`SdLogger` 는 `@simplysm/sd-core-node` 에서 export 된다(`packages/sd-core-node/src/index.ts` → `export * from "./utils/SdLogger"`). 따라서 Node 환경(서버·워커·CLI)에서만 import 한다.

```ts
import { SdLogger, SdLoggerSeverity } from "@simplysm/sd-core-node";
```

> 브라우저(Angular 클라이언트)의 시스템 로그는 `SdLogger` 가 아니라 `SdSystemLogProvider` 로 DB 에 적재한다. 클라이언트 측 구성은 [client-system-log.md](./client-system-log.md) 를 참고한다.

## 로거를 얻어 메시지를 기록하려면

`SdLogger.get([scope...])` 에 스코프 배열을 넘겨 로거 인스턴스를 만든다. 스코프는 콘솔/파일 출력에서 `[a.b.c]` 형태의 prefix 로 찍히므로, "프로젝트 → 패키지 → 모듈" 순으로 점점 좁아지게 구성한다.

`centurymes` 서버 진입점은 스코프를 프로젝트명·패키지명 2단계로 잡는다(`packages/server/src/main.ts`).

```ts
const logger = SdLogger.get(["centurymes", "server"]);
```

워커처럼 더 세분화가 필요하면 모듈명까지 한 단계 더 붙인다(`simplysm-ts` 의 `packages/server/src/workers/email-sync-worker.ts`).

```ts
const logger = SdLogger.get(["simplysm-ts", "server", "email-sync-worker"]);
```

라이브러리 내부도 같은 방식이다. `SdServiceServer` 는 클래스 필드에서 자기 위치를 스코프로 박아 둔다(`packages/sd-service-server/src/SdServiceServer.ts`).

```ts
private readonly _logger = SdLogger.get(["simplysm", "sd-service-server", this.constructor.name]);
```

얻은 로거로는 severity 별 메서드를 호출한다. 인자는 가변이며, 메시지 문자열과 객체·에러를 섞어 넘길 수 있다.

```ts
logger.debug("동기화 진입", payload);
logger.log("처리 건수", count);
logger.info("최신 버전 확인 중");
logger.warn("유효하지 않은 항목 건너뜀", item);
logger.error("email sync error: ", err);   // Error 객체는 stack 이 출력됨
```

`Error` 객체를 인자로 넘기면 콘솔·파일·외부적재 모두 `err.stack` 으로 풀어 기록한다. 따라서 `err.message` 만 따로 떼어 넘길 필요가 없다.

메시지 본문에 `[server]` 같은 수동 prefix 를 붙이지 않는다. prefix 는 `SdLogger.get([...])` 의 스코프가 담당한다.

## 출력 레벨·파일 출력을 진입점에서 설정하려면

`SdLogger.setConfig(...)` 를 진입점에서 1회 호출해 콘솔/파일 출력 방식을 정한다. 설정은 전역으로 적용되므로, 진입점(서버 `main.ts`, 각 워커 파일 상단)에서 로거를 쓰기 전에 호출한다.

severity 는 `SdLoggerSeverity` enum 으로 지정한다. 선언 순서가 곧 레벨의 우선순위이며(`debug < log < info < warn < error`), `console.level`/`file.level` 에 지정한 레벨 이상만 해당 채널로 나간다. `SdLoggerSeverity.none` 은 그 채널을 끈다.

```ts
export enum SdLoggerSeverity {
  debug = "debug",
  log = "log",
  info = "info",
  warn = "warn",
  error = "error",
  none = "",
}
```

운영(`NODE_ENV=production`)과 개발을 분기해 설정하는 것이 표준 패턴이다. 운영에서는 콘솔을 끄고(`console.level: none`) 파일에 `debug` 이상 전부를 남긴다. 개발에서는 콘솔에 `log` 이상을 찍는다. `centurymes` 서버 진입점(`packages/server/src/main.ts`):

```ts
if (process.env["NODE_ENV"] === "production") {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.none,        // 운영 콘솔 출력 끔
    },
    file: {
      level: SdLoggerSeverity.debug,       // 파일에는 debug 이상 전부
      outDir: path.resolve(__dirname, "_logs"),
    },
  });
} else if (process.env["SD_CLI_LOGGER_SEVERITY"] === "DEBUG") {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.debug,       // 디버그 모드: 콘솔에 debug 까지
    },
  });
} else {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.log,         // 일반 개발: 콘솔에 log 이상
    },
    file: {
      level: SdLoggerSeverity.debug,
      outDir: path.resolve(process.cwd(), "_logs"),
    },
  });
}
```

`file.outDir` 로 지정한 디렉터리 아래에 `yyyyMMdd` 날짜 폴더가 생기고, 그 안에 `1.log`, `2.log` 순으로 로그가 쌓인다(한 파일이 일정 크기를 넘으면 다음 번호 파일로 넘어간다). 운영 서버는 보통 진입점 기준 `_logs` 폴더를 쓰므로 `path.resolve(__dirname, "_logs")`(CommonJS) 또는 `path.resolve(import.meta.dirname, "_logs")`(ESM)로 지정한다. 워커는 진입점이 `workers/` 하위에 있으므로 서버와 같은 `_logs` 를 공유하도록 `path.resolve(import.meta.dirname, "../_logs")` 처럼 상위로 올라가 지정한다(`simplysm-ts` 워커들).

CLI 처럼 콘솔만 쓰는 진입점은 파일/외부적재 없이 콘솔 레벨만 조정한다. `sd-cli` 진입점(`packages/sd-cli/src/sd-cli-entry.ts`)은 디버그 옵션 여부로 분기한다.

```ts
if (debug) {
  SdLogger.setConfig({
    console: { level: SdLoggerSeverity.debug },
  });
} else {
  SdLogger.setConfig({ dot: true });
}
```

`setConfig` 에 지정하지 않은 항목은 기본값을 따른다. 기본값은 `console.level: log`, `file.level: none`(파일 출력 안 함), `file.outDir: <cwd>/_logs` 다(`packages/sd-core-node/src/utils/SdLogger.ts` 의 `_getConfig`). 즉 `setConfig` 를 한 번도 호출하지 않으면 콘솔에 `log` 이상만 나가고 파일은 남지 않는다.

## 특정 스코프만 다른 레벨로 설정하려면

`setConfig` 는 스코프 배열을 첫 인자로 받는 오버로드가 있다. 특정 스코프에만 다른 설정을 얹고 싶을 때 쓴다. 전역 설정을 깐 뒤, 더 좁은 스코프 설정을 추가하면 로거가 자기 스코프 경로상의 설정들을 순서대로 병합해 적용한다.

```ts
// 전역: 콘솔 log 이상
SdLogger.setConfig({ console: { level: SdLoggerSeverity.log } });

// 특정 스코프만 debug 까지 보이게
SdLogger.setConfig(["simplysm-ts", "server", "email-sync-worker"], {
  console: { level: SdLoggerSeverity.debug },
});
```

이렇게 하면 `SdLogger.get(["simplysm-ts", "server", "email-sync-worker"])` 로 만든 로거만 콘솔에 `debug` 까지 찍히고, 다른 스코프는 전역 설정(`log` 이상)을 유지한다.

## error 로그만 외부(DB 시스템 로그)로 적재하려면

운영 중 발생한 `error` 를 파일뿐 아니라 DB 시스템 로그 테이블에도 남기려면 `setConfig` 의 `customFn` 을 쓴다. `customFn` 은 모든 로그 기록 시점에 `(severity, ...logs)` 로 호출되므로, 내부에서 severity 를 보고 `error` 만 골라 적재한다.

`simplysm-ts` 서버 진입점은 운영 분기에서 `customFn` 으로 ORM 에 접속해 `db.writeSystemLog` 를 호출한다(`packages/server/src/main.ts`).

```ts
const orm = createOrm(import.meta.dirname);

if (process.env["NODE_ENV"] === "production") {
  SdLogger.setConfig({
    console: {
      level: SdLoggerSeverity.none,
    },
    file: {
      level: SdLoggerSeverity.debug,
      outDir: path.resolve(import.meta.dirname, "_logs"),
    },
    customFn: async (severity, ...logs) => {
      if (severity === SdLoggerSeverity.error) {
        await orm.connectAsync(async (db) => {
          await db.writeSystemLog(undefined, "server", "error", ...logs);
        });
      }
    },
  });
}
```

`db.writeSystemLog(userId, clientName, severity, ...logs)` 는 `@simplysm/sd-orm-common-ext` 의 `DbContextExt` 에 정의되어 있으며, 내부에서 `systemLog` 테이블에 한 행을 insert 한다. 메시지는 `util.format(...logs)` 로 합쳐 저장하므로, `logger.error("...", err)` 로 넘긴 문자열과 에러 스택이 하나의 message 로 합쳐진다(`packages/sd-orm-common-ext/src/extensions/DbContextExt.ts`).

```ts
async writeSystemLog(
  userId: number | undefined,
  clientName: string,
  severity: "error" | "warn" | "log",
  ...logs: any[]
) {
  await this.systemLog.insertAsync([
    {
      clientName: clientName,
      dateTime: new DateTime(),
      type: severity,
      message: util.format(...logs),
      userId: userId,
    },
  ]);
}
```

서버 진입점에서 시작한 워커도 자기 파일 상단에서 동일한 `setConfig` + `customFn` 을 반복한다. 워커는 별도 프로세스(`worker_threads`)라 진입점 설정을 물려받지 못하기 때문이다(`simplysm-ts` 의 `email-sync-worker.ts`, `hometax-sync-worker.ts` 등 모두 같은 블록을 둔다).

```ts
// 워커 파일 상단 — 서버 main 과 같은 customFn 을 다시 깐다
const orm = createOrm(path.resolve(import.meta.dirname, ".."));

if (process.env["NODE_ENV"] === "production") {
  SdLogger.setConfig({
    console: { level: SdLoggerSeverity.none },
    file: {
      level: SdLoggerSeverity.debug,
      outDir: path.resolve(import.meta.dirname, "../_logs"),
    },
    customFn: async (severity, ...logs) => {
      if (severity === SdLoggerSeverity.error) {
        await orm.connectAsync(async (db) => {
          await db.writeSystemLog(undefined, "server", "error", ...logs);
        });
      }
    },
  });
}
```

`customFn` 안에서 던진 예외는 로그 기록 흐름을 막지 않는다(내부에서 catch 해 별도로 콘솔에 "커스텀 로깅 실패" 를 찍는다). 그래도 `customFn` 에서 DB 접속처럼 무거운 작업을 한다면, 위 예시처럼 `error` 만 골라 적재해 부하를 제한한다.

> DB 시스템 로그 테이블 구조, 클라이언트 측 `SdSystemLogProvider.writeFn` 연동, 시스템 로그 조회 화면은 [client-system-log.md](./client-system-log.md) 를 참고한다.

## 워커에서 처리 루프의 에러를 남기려면

장시간 도는 워커는 한 사이클의 에러로 프로세스가 죽지 않게 try/catch 로 감싸고, 잡은 에러를 `logger.error` 로 남긴 뒤 다음 사이클을 이어 간다. 바깥 IIFE 의 `.catch` 까지 달아 루프 자체가 무너진 경우도 마지막에 기록한다(`simplysm-ts` 의 `email-sync-worker.ts`).

```ts
const logger = SdLogger.get(["simplysm-ts", "server", "email-sync-worker"]);

(async () => {
  while (true) {
    try {
      await EmailSync.syncAsync(orm);
    } catch (err) {
      logger.error("email sync error: ", err);   // 사이클 단위 에러 → 운영이면 DB 적재
    }

    await Wait.time(60 * 1000);
  }
})().catch((err) => {
  logger.error("bank-account worker inner error: ", err);
});
```

서버 진입점에서 워커를 띄울 때도 워커의 `error`/비정상 `exit` 를 서버 로거로 남긴다(`centurymes`·`simplysm-ts` 의 `server/src/main.ts`).

```ts
const worker = new Worker(filePath, { stdout: true, stderr: true, env: process.env });
worker.stdout.pipe(process.stdout);
worker.stderr.pipe(process.stderr);
worker.on("error", (err) => {
  logger.error(`${path.basename(filePath)} error: `, err);
});
worker.on("exit", (code) => {
  if (code !== 0) {
    logger.error(`${path.basename(filePath)} worker exit code: `, code);
  }
});
```

## 지킬 것

- 로그는 항상 `SdLogger.get([scope...])` 로 얻은 로거로 기록한다. `console.*` 직접 호출 금지.
- `import` 는 `@simplysm/sd-core-node` 에서. 브라우저(Angular) 코드에 `SdLogger` 를 들이지 않는다 — 클라이언트 시스템 로그는 `SdSystemLogProvider`([client-system-log.md](./client-system-log.md)).
- 스코프는 "프로젝트 → 패키지 → 모듈" 로 좁혀 가며 배열로 넘긴다. 메시지 본문에 `[모듈명]` 같은 수동 prefix 를 붙이지 않는다.
- `setConfig` 는 진입점(서버 `main.ts`, 각 워커 파일 상단)에서 로거 사용 전에 1회 호출한다. 워커는 별도 프로세스이므로 서버와 동일한 설정을 워커 파일에도 다시 둔다.
- 운영에서는 콘솔을 `none` 으로 끄고 파일에 `debug` 이상을 남긴다. 개발에서는 콘솔 `log`(또는 디버그 모드 `debug`) 로 둔다.
- 에러를 외부(DB)에 남길 때는 `customFn` 안에서 `severity === SdLoggerSeverity.error` 만 골라 `db.writeSystemLog(...)` 로 적재한다. 모든 severity 를 무조건 DB 에 넣지 않는다.
- `Error` 객체는 그대로 `logger.error(message, err)` 로 넘긴다. stack 은 로거가 풀어 기록하므로 `err.message` 만 떼어내지 않는다.

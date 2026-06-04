# 클라이언트 시스템 로그 적재 매뉴얼

클라이언트(Angular)에서 프레임워크가 잡은 시스템 에러·경고를 DB 등 외부 저장소에 적재하고, 직접 시스템 로그를 남기려 할 때 참조.

`SdSystemLogProvider`(`@simplysm/angular`, `providedIn: "root"`)가 그 통로. 내부적으로는 `createLogger("angular:system-log")` 로 **항상 콘솔에 먼저 출력**한 뒤, 앱이 꽂은 `writeFn` 이 있으면 추가로 외부에 흘려보냄. 즉 [logging.md](./logging.md)의 콘솔 출력 표준 위에 "외부 적재 훅 + 프레임워크 자동 연동"을 얹은 것이며, `createLogger` 를 대체하지 않음.

지원 심각도: `"error" | "warn" | "log"`.

## 시스템 로그 테이블을 정의하려면

외부 적재 대상이 DB 라면 로그 테이블을 먼저 정의. 시간 역순 조회가 잦으므로 `dateTime` 에 DESC 인덱스를 둠.

```ts
import { Table } from "@simplysm/orm-common";
import { Employee } from "./employee";

export const SystemLog = Table("SystemLog")
  .columns((c) => ({
    id: c.bigint().autoIncrement(),
    dateTime: c.datetime(),
    severity: c.varchar(50), // "error" | "warn" | "log"
    message: c.text(), // writeFn 의 data 를 JSON 직렬화해 저장
    clientName: c.varchar(200), // 어느 클라이언트에서 발생했는지
    employeeId: c.bigint().nullable(), // 인증 전 로그도 적재되므로 nullable
  }))
  .primaryKey("id")
  .indexes((i) => [i.index("dateTime").orderBy("DESC")])
  .relations((r) => ({
    employee: r.foreignKey(["employeeId"], () => Employee),
  }));
```

- `severity` 는 `SdSystemLogProvider` 가 넘기는 세 값(`error`/`warn`/`log`)을 그대로 저장.
- `message` 는 `writeFn` 의 가변 인자 `data` 전체를 담을 수 있게 `text` + JSON 직렬화로 둠.
- `employeeId` 는 로그인 이전 시점의 에러도 기록되므로 `nullable`.

## 부트스트랩에서 외부 적재를 배선하려면

`provideAppInitializer` 안에서 `SdSystemLogProvider.writeFn` 에 적재 함수를 할당.

```ts
import { inject, provideAppInitializer } from "@angular/core";
import { DateTime, json } from "@simplysm/core-common";
import { SdSystemLogProvider } from "@simplysm/angular";

provideAppInitializer(() => {
  const appService = inject(AppServiceProvider);
  const appOrm = inject(AppOrmProvider);
  const appAuth = inject(AppAuthProvider);

  inject(SdSystemLogProvider).writeFn = async (severity, ...data) => {
    await appOrm.connectAsync(async (db) => {
      await db.systemLog().insert([
        {
          dateTime: new DateTime(),
          severity,
          message: data
            .map((l) =>
              typeof l === "string"
                ? l
                : l instanceof Error
                  ? (l.stack ?? l.message)
                  : json.stringify(l, { space: 2 }),
            )
            .join(" "),
          clientName: CLIENT_NAME,
          employeeId: appAuth.authInfo()?.employeeId,
        },
      ]);
    });
  };

  return appService.connectAsync();
}),
```

- `CLIENT_NAME` 은 `provideSdAngular({ clientName: CLIENT_NAME })` 에 넘긴 값과 동일하게 두어 어느 앱에서 난 로그인지 구분.
- `data` 는 가변 인자 배열. 각 인자를 string→그대로 / Error→`stack` / 객체→`json.stringify` 로 문자열화해 공백으로 join 하여 저장(Error 의 `stack` 보존).
- `writeFn` 미설정 시 외부 적재는 일어나지 않고 콘솔 출력만 수행됨. DB 적재가 필요한 앱에서만 배선.

## 자동으로 적재되는 로그

다음 프레임워크 지점이 별도 호출 없이 `writeAsync` 를 부르므로, `writeFn` 만 배선하면 자동으로 외부에 적재됨:

- `SdGlobalErrorHandlerPlugin` — 미처리 에러·미처리 Promise 거부를 `writeAsync("error", ...)`, `error` 가 없는 `ErrorEvent` 는 `writeAsync("warn", ...)`.
- `SdToastProvider.try()` / `.danger()` — 잡은 에러를 토스트로 띄울 때 `writeAsync("error", ...)`.

## 직접 시스템 로그를 남기려면

업무 코드에서 직접 적재하려면 프로바이더를 주입해 `writeAsync` 호출:

```ts
private readonly _sdSystemLog = inject(SdSystemLogProvider);

await this._sdSystemLog.writeAsync("error", "결제 승인 실패", err.stack);
```

- 콘솔 출력은 항상 일어나고, `writeFn` 이 배선돼 있으면 외부 적재까지 이어짐.

## 적재된 로그를 조회하려면

`SystemLog` 테이블을 일반 ORM 조회로 읽으면 됨([orm.md](./orm.md) 참조). 시간 역순 인덱스를 활용해 `dateTime` 내림차순으로 정렬.

## 지킬 것

- `writeFn` 안의 적재 실패는 throw 하지 않음. `SdSystemLogProvider` 가 `writeFn` 호출을 try/catch 로 감싸 실패를 `logger.error` 로만 남기고 삼킴 — 로그 적재 실패가 원래 동작(에러 처리·화면 흐름)을 막지 않게 하기 위한 설계. 이 자리는 silent skip 금지 원칙의 예외가 아니라, "로그 싱크 실패는 본 동작과 분리한다"는 의도된 동작.
- `writeFn` 은 부트스트랩(`provideAppInitializer`)에서 1회만 할당. 화면·서비스 코드에서 재할당하지 않음.
- 콘솔에 찍는 것 자체는 `SdSystemLogProvider` 가 내부에서 `createLogger` 로 처리하므로, 시스템 로그를 남기려고 `console.*` 를 직접 호출하지 않음([logging.md](./logging.md)).

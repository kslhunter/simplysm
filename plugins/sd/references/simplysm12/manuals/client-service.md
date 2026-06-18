# 앱에서 서버 서비스 메서드를 호출하기

앱(클라이언트)이 서버의 로직을 실행하려면, 서버에 `SdServiceBase` 를 상속한 서비스 클래스를 두고, 앱에서 `SdServiceClient.sendAsync("서비스명", "메서드명", [인자들])` 로 원격 호출한다. v12 에서는 이 원격 호출 진입점을 앱마다 만드는 root provider `AppServiceProvider` 가 관리하고, 호출 코드를 깔끔하게 쓰기 위해 서비스마다 얇은 래퍼 클래스(`XxxServiceClient`)를 common 패키지에 둔다.

전체 흐름은 세 계층으로 나뉜다.

- **server 패키지** — `class XxxService extends SdServiceBase` 에 public 메서드를 작성하고, `main.ts` 의 `services` 배열에 등록한다.
- **common 패키지** — `class XxxServiceClient` 가 `client.sendAsync(...)` 를 감싸 타입이 붙은 메서드로 노출한다.
- **client 패키지** — `AppServiceProvider` 가 `XxxServiceClient` 인스턴스를 게터로 제공하고, 화면에서 `inject(AppServiceProvider).xxx().method(...)` 로 부른다.

ORM 으로 DB 에 직접 접근하는 방법은 [orm.md](./orm.md), 서버가 앱으로 거꾸로 푸시하는 실시간 이벤트는 [event.md](./event.md) 를 참조한다. 이 문서는 앱 → 서버 단방향 RPC 호출만 다룬다.

## AppServiceProvider 를 정의하려면 (새 앱 1회성)

서버 연결·서비스 호출의 공통 진입점을 하나의 root provider 에 모은다. `SdServiceClientFactoryProvider`(@simplysm/sd-angular) 로부터 연결된 `SdServiceClient` 를 얻고, 내장 서비스(ORM·암호화·메일)와 프로젝트 커스텀 서비스를 각각 게터로 노출한다.

`simplysm-ts` 의 `client-common/providers/AppServiceProvider.ts` 가 그대로 이 형태다.

```ts
import { inject, Injectable } from "@angular/core";
import { $computed, SdServiceClientFactoryProvider } from "@simplysm/sd-angular";
import {
  SdCryptoServiceClient,
  SdOrmServiceClientConnector,
  SdSmtpClientServiceClient,
} from "@simplysm/sd-service-client";
import { EmailServiceClient, BankAccountServiceClient } from "@simplysm-ts/common";
import { APP_MAIN_SERVICE_KEY } from "../commons/commons";
import { JsonConvert, NumberUtils } from "@simplysm/sd-core-common";

@Injectable({ providedIn: "root" })
export class AppServiceProvider {
  #sdServiceClientFactory = inject(SdServiceClientFactoryProvider);

  get client() {
    return this.#sdServiceClientFactory.get(APP_MAIN_SERVICE_KEY);
  }

  // 내장 서비스 (sd-service-client 가 제공하는 래퍼)
  orm = $computed(() => new SdOrmServiceClientConnector(this.client));
  crypto = $computed(() => new SdCryptoServiceClient(this.client));
  smtpClient = $computed(() => new SdSmtpClientServiceClient(this.client));

  // 프로젝트 커스텀 서비스 (common 패키지의 래퍼)
  email = $computed(() => new EmailServiceClient(this.client));
  bankAccount = $computed(() => new BankAccountServiceClient(this.client));

  async connectAsync() {
    await this.#sdServiceClientFactory.connectAsync(
      APP_MAIN_SERVICE_KEY,
      Boolean(process.env["SERVER_HOST"])
        ? {
            host: process.env["SERVER_HOST"],
            port: NumberUtils.parseInt(process.env["SERVER_PORT"]),
            ssl: JsonConvert.parse(process.env["SERVER_SSL"] ?? "false"),
          }
        : {},
    );
  }
}
```

지킬 것:

- `@Injectable({ providedIn: "root" })` 로 앱 전역 싱글톤으로 둔다.
- 서비스 키는 상수로 추출한다. `simplysm-ts` 는 `client-common/commons/commons.ts` 에 `export const APP_MAIN_SERVICE_KEY = "MAIN";` 로 둔다. 이 키는 `client` 게터(`get`)와 `connectAsync` 양쪽에서 같은 값을 써야 한다 — `SdServiceClientFactoryProvider.connectAsync(key)` 로 맺은 연결을 `get(key)` 로 꺼내는 구조라, 키가 어긋나면 "연결하지 않은 클라이언트 키입니다." 가 던져진다.
- `get client()` 는 매번 팩토리의 `get(키)` 를 호출해 연결된 `SdServiceClient` 를 돌려준다. 모든 서비스·ORM 호출이 이 한 객체를 공유한다.
- 각 서비스는 `xxx = $computed(() => new XxxServiceClient(this.client))` 패턴으로 노출한다. `$computed`(@simplysm/sd-angular) 로 감싸므로 `client` 가 바뀌지 않는 한 같은 래퍼 인스턴스가 재사용된다. 호출은 게터를 한 번 실행해서 쓴다 — `this.#appService.email().sync(...)` 처럼 `email()` 뒤에 메서드를 잇는다.
- `connectAsync()` 는 부트스트랩에서 한 번 호출해 실제 WebSocket 연결을 맺는다. 클라이언트와 서버를 다른 호스트에 배포할 수 있도록 `SERVER_HOST`·`SERVER_PORT`·`SERVER_SSL` 환경변수가 있으면 그 값으로, 없으면 빈 객체(`{}`)를 넘긴다. 빈 객체를 넘기면 팩토리가 `location.hostname`·`location.port`·현재 프로토콜의 ssl 여부로 same-origin 연결을 구성한다(`SdServiceClientFactoryProvider.connectAsync` 의 기본값 병합).

`centurymes` 의 `client-common/providers/AppServiceProvider.ts` 도 동일 골격이며, 게터 목록만 그 프로젝트 서비스(`smartFactory = $computed(() => new SmartFactoryServiceClient(this.client))`)로 다르다.

## 부트스트랩에서 서버에 연결하려면

`provideAppInitializer` 안에서 `AppServiceProvider.connectAsync()` 를 호출하고 그 Promise 를 `await`(=반환) 한다. Angular 가 이 초기화를 기다린 뒤 화면을 띄우므로, 화면·프로바이더가 통신을 시작하는 시점에는 연결이 이미 끝나 있다.

`simplysm-ts` 의 `client-admin/main.ts` 가 이 배선이다.

```ts
//-- 커넥션
provideAppInitializer(async () => {
  await inject(AppServiceProvider).connectAsync();
}),
```

지킬 것:

- 반드시 `await`(또는 Promise 반환) 한다. `get client()` 가 호출하는 팩토리의 `get(키)` 는 아직 연결되지 않은 키면 즉시 throw 하므로, 연결 완료 전에 화면이 떠 서비스를 부르면 실패한다.
- `connectAsync()` 이후에 동작하는 다른 초기화(예: 로그 DB 적재용 `SdSystemLogProvider.writeFn` 배선, [orm.md](./orm.md) 의 `AppOrmProvider`)는 이 커넥션 initializer 뒤에 둔다.

## 화면에서 서버 메서드를 호출하려면

화면 컴포넌트에서 `AppServiceProvider` 를 hard private(`#`)로 주입하고, 노출된 서비스 게터를 통해 메서드를 부른다. 에러를 사용자에게 토스트로 보여주려면 `SdToastProvider.try(...)` 안에서 호출한다.

`simplysm-ts` 의 `EmailReceivedPage.ts` 가 전형적인 예다.

```ts
export class EmailReceivedPage /* extends ... */ {
  #appService = inject(AppServiceProvider);
  #appAuth = inject(AppAuthProvider);
  #sdToast = inject(SdToastProvider);

  async onRequestSyncButtonClick() {
    await this.#sdToast.try(async () => {
      await this.#appService.email().sync({
        userId: this.#appAuth.authInfo()!.user.id,
      });
      await this.refresh();
    });
  }

  async onDownloadEmlButtonClick(item: IItem) {
    await this.#sdToast.try(async () => {
      const buf = await this.#appService.email().getEmlBuffer({ emailReceivedId: item.id });
      const blob = new Blob([buf]);
      blob.download(item.subject + ".eml");
    });
  }
}
```

지킬 것:

- `this.#appService.email()` 처럼 서비스 게터를 호출해 래퍼 인스턴스를 얻고, 그 위에서 메서드를 부른다. 메서드는 모두 `Promise` 이므로 `await` 한다.
- 결과를 그대로 활용한다. `getEmlBuffer` 는 `Buffer` 를 돌려주므로 `new Blob([buf]).download(...)` 로 파일을 내려받게 하고, `getAttachments` 는 배열을 돌려주므로 순회해 각각 다운로드시킨다(`EmailReceivedPage.onDownloadAttachmentButtonClick`). 즉 서버 메서드의 반환 타입이 화면 동작으로 직결된다.
- 사용자 작업 버튼에서 부르는 호출은 `SdToastProvider.try(async () => {...})` 로 감싸 예외가 자동으로 danger 토스트로 표시되게 한다.

내장 서비스도 같은 방식이다. 비밀번호를 단방향 암호화할 때는 `crypto` 게터를 쓴다 — `simplysm-ts` 의 `AppAuthProvider.authAsync` 가 `const encryptedPassword = await this.#appService.crypto().encrypt(password);` 로 암호화한 뒤 ORM 인증에 넘긴다. 메일 발송은 `this.#appService.smtpClient().sendByConfig("DEFAULT", {...})`(`PasswordResetModal.ts`) 형태다.

게터를 거치지 않고 `client.sendAsync` 를 직접 부를 수도 있다 — 래퍼 클래스 내부가 정확히 이것을 한다(아래 절). 다만 화면 코드에서는 서비스명·메서드명·인자 배열을 문자열로 직접 적기보다 래퍼 게터를 쓰는 편을 따른다. 같은 호출 규약을 한 곳(common 의 래퍼)에만 두기 위함이다.

## 새 서버 서비스를 추가하려면

새 서버 기능을 앱에 노출하려면 (1) server 에 서비스 클래스를 만들어 등록하고, (2) common 에 호출 래퍼를 만들고, (3) `AppServiceProvider` 에 게터를 추가한다. 세 곳을 한 세트로 작업한다.

### 1) server: SdServiceBase 를 상속한 서비스 클래스 작성

`server` 패키지에 `class XxxService extends SdServiceBase`(@simplysm/sd-service-server) 를 만든다. **public 메서드가 곧 원격 호출 가능한 API** 이고, 메서드 이름이 클라이언트의 `sendAsync` 두 번째 인자와 일치해야 한다.

`simplysm-ts` 의 `server/src/services/BankAccountService.ts` 가 예다.

```ts
import { SdServiceBase } from "@simplysm/sd-service-server";
import { IBankAccount, TBankAccountAuthApiConf } from "@simplysm-ts/common";
import { DateOnly } from "@simplysm/sd-core-common";
import { createOrm } from "../createOrm";
import { BankAccountApiWrapper } from "../accounting/sync/BankAccountApiWrapper";

export class BankAccountService extends SdServiceBase {
  async getAccounts(apiConf: TBankAccountAuthApiConf): Promise<IBankAccount[]> {
    const api = await BankAccountApiWrapper.createApiAndLoginAsync(apiConf);
    return await api.getAccountsAsync();
  }

  async syncLogs(param: { isFromDateForLastSync: boolean; fromDate?: DateOnly; toDate: DateOnly }) {
    const orm = createOrm(this.server, this.clientName);
    await BankAccountApiWrapper.syncAsync(orm, param);
  }
}
```

작성 시 지킬 것:

- `extends SdServiceBase`. 인자·반환 타입(`IBankAccount`, `TBankAccountAuthApiConf` 등)은 common 패키지에 정의해 클라이언트 래퍼와 공유한다.
- 메서드 안에서 DB 가 필요하면 서비스 안에서 ORM 을 직접 만들어 쓴다. `simplysm-ts` 는 `createOrm(this.server, ...)` 헬퍼(`server/src/createOrm.ts`)를 둬, `SdServiceBase.server` 로 주입된 서버 인스턴스에서 설정을 읽어 `new SdOrm(MainDbContext, {...})` 를 만든다. 어느 클라이언트의 호출인지는 호출 컨텍스트(클라이언트명)로 구분한다 — `SdServiceBase` 는 호출 주체를 식별하는 멤버를 제공하므로, 그 값을 `createOrm` 에 넘겨 클라이언트별 설정을 병합한다.

  > 버전 메모: `SdServiceBase` 의 클라이언트 식별 멤버는 v12 진행 중 바뀌었다. 라이브러리 소스(12.16 대)는 `get clientName()` 게터를 제공한다(`packages/sd-service-server/src/core/SdServiceBase.ts`). 한편 `simplysm-ts`/`centurymes` 가 설치한 12.14 대 `SdServiceBase`(node_modules `.../src/types.ts`)는 `request?: ISdServiceRequest` 필드를 두어 `this.request?.clientName` 으로 접근한다. 작업 중인 프로젝트가 의존하는 `@simplysm/sd-service-server` 의 실제 `SdServiceBase` 시그니처를 확인하고 맞춘다.

- 서버 설정(`.config.json`)의 한 섹션을 읽어야 하면, 12.16 대 소스에서는 `await this.getConfigAsync<T>("섹션명")` 으로 루트·클라이언트 설정을 병합해 받는다(내장 `SdOrmService`/`SdCryptoService` 가 각각 `getConfigAsync("orm")`/`getConfigAsync("crypto")` 로 읽는다). 12.14 대에서는 `this.server.getConfig(clientName)` 를 직접 읽는다(`createOrm.ts` 가 이 형태). 역시 설치된 버전의 시그니처를 따른다.

### 2) server: main.ts 의 services 배열에 등록

서비스 클래스는 `SdServiceServer` 의 `services` 배열에 넣어야 호출 대상이 된다. 등록하지 않으면 클라이언트의 `sendAsync` 가 "서비스를 찾을 수 없습니다." 류로 실패한다. 클래스 `name` 이 요청의 서비스명과 매칭된다.

`simplysm-ts` 의 `server/src/main.ts`:

```ts
const server = new SdServiceServer({
  rootPath: import.meta.dirname,
  services: [
    SdAutoUpdateService,   // 내장
    SdOrmService,          // 내장 (앱의 ORM 접속이 이 위에서 동작)
    SdSmtpClientService,   // 내장
    SdCryptoService,       // 내장
    HometaxService,        // 프로젝트 커스텀
    BankAccountService,    // ← 방금 만든 서비스
    PaymentCardService,
    EmailService,
  ],
  port: 50180,
});

await server.listenAsync();
```

지킬 것:

- 내장 서비스(`SdOrmService`·`SdCryptoService`·`SdSmtpClientService`·`SdAutoUpdateService`, 모두 @simplysm/sd-service-server)는 클라이언트의 ORM 접속·암호화·메일·자동업데이트가 동작하는 전제이므로 함께 등록한다. `centurymes` 의 `server/src/main.ts` 도 `SdOrmService`·`SdCryptoService`·`SdAutoUpdateService` 를 등록한다(필요 없는 `SdSmtpClientService` 는 주석 처리).
- 새 커스텀 서비스 클래스를 배열에 추가한다. `import { BankAccountService } from "./services/BankAccountService";`.

### 3) common: 호출 래퍼(XxxServiceClient) 작성

`common` 패키지에 `class XxxServiceClient` 를 만들어, 생성자로 받은 `SdServiceClient` 에 `sendAsync("서비스명", "메서드명", [인자들])` 를 위임한다. 이 래퍼가 클라이언트 쪽 호출 규약을 한곳에 모아 타입까지 붙여 준다.

`simplysm-ts` 의 `common/service-clients/EmailServiceClient.ts`:

```ts
import { SdServiceClient } from "@simplysm/sd-service-client";
import { IEmailAttachment } from "../email.types";

export class EmailServiceClient {
  #client: SdServiceClient;

  constructor(client: SdServiceClient) {
    this.#client = client;
  }

  async sync(param: { userId: number }) {
    return await this.#client.sendAsync("EmailService", "sync", [param]);
  }

  async getAttachments(param: { emailReceivedId: number }): Promise<IEmailAttachment[]> {
    return await this.#client.sendAsync("EmailService", "getAttachments", [param]);
  }

  async getEmlBuffer(param: { emailReceivedId: number }): Promise<Buffer> {
    return await this.#client.sendAsync("EmailService", "getEmlBuffer", [param]);
  }
}
```

지킬 것:

- 생성자는 `SdServiceClient` 하나만 받아 `#client` 에 보관한다. 이 인스턴스는 `AppServiceProvider` 의 게터가 `new EmailServiceClient(this.client)` 로 넘겨 준다.
- 각 메서드는 `sendAsync` 의 세 인자를 그대로 채운다. 첫 인자는 **server 의 서비스 클래스명**(`"EmailService"`), 둘째는 **메서드명**(`"sync"`), 셋째는 **인자들의 배열**(`[param]`). 세 값이 서버 메서드 시그니처와 정확히 일치해야 한다. `SmartFactoryServiceClient`(centurymes) 처럼 인자가 여러 개면 배열에 순서대로 담는다 — `this.#client.sendAsync("SmartFactoryService", "sendEmployeeAssign", [apiConf, type])`.
- 반환 타입을 메서드에 명시한다(`Promise<IEmailAttachment[]>`, `Promise<Buffer>`). `sendAsync` 자체는 `Promise<any>` 라 타입이 사라지므로, 래퍼에서 타입을 달아야 화면 코드가 결과를 타입 안전하게 다룬다.
- 래퍼를 `common` 패키지 index 에서 export 한다(`export * from "./service-clients/EmailServiceClient";`). server 의 메서드 인자·반환 타입도 이 common 패키지 타입을 공유한다.

### 4) client: AppServiceProvider 에 게터 추가

마지막으로 `AppServiceProvider` 에 게터 한 줄을 더해 화면에서 부를 수 있게 한다.

```ts
import { EmailServiceClient } from "@simplysm-ts/common";

// AppServiceProvider 안:
email = $computed(() => new EmailServiceClient(this.client));
```

이제 화면에서 `this.#appService.email().sync({ userId })` 로 호출하면, common 래퍼가 `client.sendAsync("EmailService", "sync", [{ userId }])` 를 보내고, 서버의 `EmailService.sync` 가 실행되어 그 반환값이 화면으로 돌아온다.

## 지킬 것 (요약)

- 한 서비스는 **server 클래스 + main.ts 등록 + common 래퍼 + provider 게터** 4곳을 한 세트로 작업한다. 어느 하나라도 빠지면(특히 `services` 배열 등록 누락) 런타임 호출이 실패한다.
- 서비스명·메서드명은 단일 출처(server 의 클래스명·메서드명)를 그대로 따른다. 문자열은 common 래퍼 안에서만 적고, 화면 코드는 래퍼 게터만 쓴다.
- 서비스 키(`APP_MAIN_SERVICE_KEY = "MAIN"`)는 상수로 두고 `connectAsync`·`get` 양쪽에서 같은 값을 쓴다.
- 부트스트랩 `provideAppInitializer` 에서 `connectAsync()` 를 `await` 한 뒤에만 서비스 호출이 가능하다.
- DB 접근은 서버 서비스 메서드 안에서 ORM 으로 한다(클라이언트가 서버를 경유해 DB 에 직접 쿼리하는 원격 ORM 은 [orm.md](./orm.md) 참조). 서버 → 앱 실시간 푸시는 [event.md](./event.md) 참조.

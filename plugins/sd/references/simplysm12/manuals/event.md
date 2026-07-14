# 서비스 이벤트 매뉴얼

서버에 연결된 다른 클라이언트(또는 같은 클라이언트)에게 실시간으로 알림을 보내야 할 때 참조함. 예를 들어 관리자가 어떤 사용자의 권한을 변경하면, 그 사용자가 접속 중인 화면이 즉시 권한 정보를 다시 불러와 반영되도록 만듦.

이벤트는 WebSocket 연결 위에서 동작함. 따라서 그 시점에 서버에 연결되어 있는 클라이언트에게만 전달되며, 오프라인 클라이언트를 위한 보관·재전송은 없음.

기본 흐름은 다음과 같음.

```
[정의]   공통 패키지에 class XxxListener extends SdServiceEventListenerBase<TInfo, TData> {}

[발생]   클라이언트: appService.client.emitAsync(XxxListener, infoSelector, data)
         서버:       this.server.emitEvent(XxxListener, infoSelector, data)
             │
             ▼  서버가 등록된 구독들 중 infoSelector 가 true 인 대상만 골라 전달
[구독]   클라이언트: appService.client.addEventListenerAsync(XxxListener, info, cb)
             → 반환된 키(string)를 보관했다가 파기 시 removeEventListenerAsync(key) 로 해제
```

- **구독(리스너 등록)은 클라이언트에서만** 함. 서버는 발생만 할 수 있음(`addEventListenerAsync` 가 없음).
- **발생은 클라이언트·서버 양쪽에서** 할 수 있음. 화면 동작으로 생긴 변경을 알리는 경우가 대부분이라 클라이언트 발생이 더 흔함.

서비스 클라이언트(`appService.client`) 자체의 전반적인 사용은 [client-service.md](./client-service.md) 를 참조함.

## 이벤트 리스너 타입을 정의하려면

`SdServiceEventListenerBase<TInfo, TData>`(`@simplysm/sd-service-common`)를 상속한 빈 클래스를 선언하고, **공통 패키지(`@<workspace>/common`)에서 export** 함. 발생측(클라이언트·서버)과 구독측(클라이언트)이 모두 같은 클래스를 값으로 import 해야 하므로, 양쪽 모두에서 참조 가능한 공통 패키지에 둠.

```ts
// @<workspace>/common 의 events.ts
import { SdServiceEventListenerBase } from "@simplysm/sd-service-common";

export class AuthInfoEventListener extends SdServiceEventListenerBase<
  { userId: number }, // TInfo: 구독을 식별·필터링하는 메타데이터
  undefined // TData: 이벤트가 실어 나르는 페이로드
> {}
```

(근거: `simplysm-ts/packages/common/src/events.ts`, `centurymes/packages/common/src/events.ts`)

- 두 제네릭의 의미는 다음과 같음.
  - `TInfo` — 구독자가 "무엇을 구독하는지" 식별하는 메타데이터. 구독 시 `addEventListenerAsync` 의 `info` 인자로 넣고, 발생 시 `infoSelector` 가 이 값을 받아 전달 대상인지 판정함.
  - `TData` — 콜백으로 전달되는 페이로드. 위 예처럼 별도 데이터가 필요 없으면 `undefined` 로 둠.
- **클래스 본문은 비워 둠.** 이 클래스는 인스턴스를 만들거나 메서드를 호출하기 위한 것이 아니라, 이벤트 이름(`클래스명`)과 `TInfo`/`TData` 타입을 한 곳에 묶어 두는 식별자 역할만 함. 발생·구독 호출 시 이 클래스를 첫 인자로 그대로 넘기면 클래스명이 라우팅 키가 되고 `info`/`data` 타입이 자동 추론됨.
- 클래스명이 곧 이벤트 식별자이므로 앱 내에서 고유해야 함.

## 클라이언트에서 이벤트를 구독하려면

`appService.client.addEventListenerAsync(Listener, info, cb)` 를 호출함. 반환값은 해제에 사용할 키(`string`)이므로 컴포넌트·프로바이더의 필드에 보관함.

```ts
@Injectable({ providedIn: "root" })
export class AppAuthProvider {
  #appService = inject(AppServiceProvider);
  // ...

  #authEventKey?: string;

  async #registerAuthEventAsync() {
    await this.#unregisterAuthEventAsync(); // 중복 등록 방지: 먼저 기존 구독 해제

    this.#authEventKey = await this.#appService.client.addEventListenerAsync(
      AuthInfoEventListener,
      { userId: this.authInfo()!.user.id }, // info: 이 구독이 받을 범위
      async () => {
        await this.reloadAuthAsync(); // 전달되면 인증 정보를 다시 로딩
      },
    );
  }
}
```

(근거: `simplysm-ts/packages/client-admin/src/providers/AppAuthProvider.ts`, `centurymes/packages/client-admin/src/providers/AppAuthProvider.ts`)

- 첫 인자는 정의한 리스너 클래스임. 두 번째 인자 `info` 는 그 클래스의 `TInfo` 타입으로, 발생측 `infoSelector` 가 이 값을 보고 전달 여부를 결정함.
- 콜백의 인자는 `TData` 타입으로 추론됨. 위처럼 `TData` 가 `undefined` 면 콜백은 인자 없이 받아 처리만 함 — 페이로드를 신뢰하기보다, 이벤트를 신호로 삼아 최신 상태를 다시 조회(reload)하는 방식임.
- `addEventListenerAsync` 는 서버에 연결되지 않은 상태에서 호출하면 `서버와 연결되어있지 않습니다.` 를 throw 함(`sd-service-client/src/SdServiceClient.ts`). 부트스트랩에서 서비스 연결(`appService.connectAsync()`)이 끝난 뒤, 또는 위처럼 인증 완료 직후에 등록함.

## 구독을 해제하려면

등록 때 받은 키로 `removeEventListenerAsync(key)` 를 호출함. 키 없이 일괄 해제하는 방법은 없으므로, 등록 시 받은 키를 반드시 필드에 보관함.

```ts
async #unregisterAuthEventAsync() {
  if (this.#authEventKey != null) {
    await this.#appService.client.removeEventListenerAsync(this.#authEventKey);
  }
}
```

(근거: `centurymes/packages/client-admin/src/providers/AppAuthProvider.ts`)

- 화면 컴포넌트에서 구독했다면 컴포넌트가 파기되는 시점(Angular `ngOnDestroy` 등)에 해제함. 미해제 리스너는 재로그인·재연결을 거듭할수록 누적되어, 한 번의 이벤트로 콜백이 여러 번 실행되는 문제가 생김.
- 위 `AppAuthProvider` 패턴처럼, 재등록 직전에도 항상 먼저 해제를 호출해 두면 같은 구독이 중복으로 쌓이지 않음.

## 클라이언트에서 이벤트를 발생시키려면

화면 동작으로 생긴 변경을 다른 클라이언트에 알리는, 가장 흔한 경우임. `appService.client.emitAsync(Listener, infoSelector, data)` 를 호출함. 보통 데이터 저장(`submit`)이 끝난 직후 호출함.

```ts
// UserPermissionDetail: 어떤 사용자의 권한을 저장한 뒤,
// 그 사용자를 구독 중인 클라이언트에게만 알린다.
override async submit() {
  await this.#appOrm.connectAsync(async (db) => {
    // ... 권한 저장 ...
  });

  await this.#appService.client.emitAsync(
    AuthInfoEventListener,
    (info) => info.userId === this.userId(), // 대상 구독을 고르는 판정 함수
    undefined,                                // TData 가 undefined 이므로 undefined 전달
  );

  return true;
}
```

(근거: `simplysm-ts/packages/client-admin/src/app/home/base/user-permission/UserPermissionDetail.ts`, 같은 패턴이 `.../my-info/MyInfoPage.ts` 에도 있음)

- 첫 인자는 정의한 리스너 클래스, 두 번째 인자 `infoSelector` 는 각 구독의 `info`(즉 `TInfo`)를 받아 전달 대상인지 판정하는 함수, 세 번째 인자 `data` 는 `TData` 페이로드임.
- 위 예에서 구독측(`AppAuthProvider`)은 `{ userId: 로그인한 사용자 id }` 로 구독해 두었으므로, 권한이 바뀐 사용자가 접속해 있으면 `info.userId === this.userId()` 가 `true` 가 되어 그 클라이언트의 콜백(`reloadAuthAsync`)이 실행됨.
- 자기 자신이 같은 이벤트를 같은 조건으로 구독 중이라면, `infoSelector` 에 걸릴 경우 자신의 콜백도 함께 실행됨.

## 서버에서 이벤트를 발생시키려면

서버 측 처리(예: 외부 시스템 연동 결과 반영, 배치 처리 완료 통지)에서 알릴 때 사용함. 서비스 클래스는 `SdServiceBase`(`@simplysm/sd-service-server`)를 상속하며, 이 클래스가 노출하는 `this.server`(`SdServiceServer`)의 `emitEvent(Listener, infoSelector, data)` 를 호출함.

```ts
import { SdServiceBase } from "@simplysm/sd-service-server";
import { AuthInfoEventListener } from "@<workspace>/common";

export class UserService extends SdServiceBase {
  async syncPermission(param: { userId: number }) {
    // ... 서버 측 처리 ...

    await this.server.emitEvent(
      AuthInfoEventListener,
      (info) => info.userId === param.userId,
      undefined,
    );
  }
}
```

(근거: 발생 API 는 `sd-service-server/src/SdServiceServer.ts` 의 `emitEvent`, 서버 참조는 `sd-service-server/src/core/SdServiceBase.ts` 의 `server` 필드. 서비스 클래스를 `SdServiceBase` 로 작성하는 패턴은 `simplysm-ts/packages/server/src/services/EmailService.ts`)

- 발생 시그니처(`(Listener, infoSelector, data)`)는 클라이언트의 `emitAsync` 와 동일함. 단지 호출 주체가 `appService.client` 가 아니라 서버 인스턴스(`this.server`)일 뿐임.
- 이 서비스 클래스는 서버 `main.ts` 의 `SdServiceServer({ services: [...] })` 에 등록되어 있어야 클라이언트가 호출할 수 있음(`simplysm-ts/packages/server/src/main.ts`). 커스텀 서비스 작성·등록 전반은 [server-service.md](./client-service.md) 를 참조함.

## 특정 구독자에게만 전달하려면

이벤트는 같은 클래스로 등록된 모든 구독을 대상으로 하되, 발생 시 넘긴 `infoSelector` 가 `true` 를 돌려준 구독에만 콜백이 실행됨. 구독측이 등록한 `info` 와 발생측의 `infoSelector` 를 맞물려 대상을 좁히는 구조임.

```ts
// 구독측: 각 클라이언트는 자신의 사용자 id 로 구독
await client.addEventListenerAsync(AuthInfoEventListener, { userId: 7 }, cb7);
await client.addEventListenerAsync(AuthInfoEventListener, { userId: 9 }, cb9);

// 발생측: userId === 7 인 구독만 대상 → cb7 만 실행, cb9 는 호출되지 않음
await client.emitAsync(AuthInfoEventListener, (info) => info.userId === 7, undefined);
```

- 연결된 모든 구독자에게 보내려면 `() => true` 를 `infoSelector` 로 넘김.
- 어떤 구독에도 걸리지 않으면 아무 콜백도 실행되지 않음.

## 지킬 것

- 리스너 클래스는 본문을 비운 채 공통 패키지에 두고, 발생·구독 호출에 그 클래스를 그대로 첫 인자로 넘김. 이벤트 이름 문자열을 따로 적거나, 발생·구독마다 타입을 중복으로 명시하지 않음.
- 구독은 클라이언트에서만 함. 서버는 발생 전용이며 리스너를 등록할 수 없음. 서버가 다른 서버 동작의 완료를 기다려야 한다면 이벤트가 아닌 다른 수단을 씀.
- `addEventListenerAsync` 가 돌려준 키는 반드시 보관하고, 화면·프로바이더가 파기되거나 재로그인할 때 `removeEventListenerAsync` 로 해제함. 재등록 직전에도 먼저 기존 구독을 해제해 중복 누적을 막음.
- 등록은 서버 연결이 끝난 뒤에 함. 연결 전에 호출하면 `서버와 연결되어있지 않습니다.` 로 throw 됨. 재연결 시 이미 등록된 리스너는 클라이언트가 자동으로 다시 구독하므로, 연결 복구를 감지해 수동으로 다시 `addEventListenerAsync` 하지 않음.
- 전달은 그 시점에 연결된 클라이언트에게만 일어나고 재전송이 없음. 그래서 페이로드(`TData`)에 모든 정보를 담아 신뢰하기보다, 이벤트를 "변경되었다"는 신호로만 쓰고 콜백에서 최신 상태를 다시 조회(reload)하는 방식이 안전함. 위 인증 정보 예시도 페이로드 없이(`undefined`) 신호만 보내고 `reloadAuthAsync()` 로 재조회함.

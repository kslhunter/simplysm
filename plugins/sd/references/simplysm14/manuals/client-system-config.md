# 클라이언트 시스템 설정 영속화 매뉴얼

클라이언트(Angular) 의 사용자별 UI, 시스템 설정을 저장, 복원하려 할 때 참조하세요.

- 대상 예: 시트 컬럼 너비, 순서, 숨김, 모달 크기, 위치.

`SdSystemConfigProvider`(`@simplysm/angular`, `providedIn: "root"`) 가 그 통로입니다.

- `setAsync(key, data)` / `getAsync(key)` 로 키-값을 저장, 조회합니다.
- 프레임워크 컴포넌트(`sd-sheet` 컬럼 설정, `sd-modal` 크기 등) 가 이를 통해 상태를 보존합니다.

저장 위치는 앱이 `fn` 을 배선했는지로 갈립니다.

- `fn` **미배선(기본)** — 브라우저 `localStorage`. 그 기기, 브라우저에만 남습니다.
- `fn` **배선** — 앱이 준 `set`/`get` 으로 위임합니다. 서버 DB 에 사용자별로 저장하면 기기가 바뀌어도 설정이 유지됩니다.

## 사용자별로 서버(DB)에 저장하려면

`provideAppInitializer` 안에서 `SdSystemConfigProvider.fn` 에 `set`/`get` 을 할당하세요.

- 로그인 사용자(employee) 별로 설정을 DB 에 저장, 조회합니다.

```ts
import { inject, provideAppInitializer } from "@angular/core";
import { json } from "@simplysm/core-common";
import { expr } from "@simplysm/orm-common";
import { SdSystemConfigProvider } from "@simplysm/angular";

provideAppInitializer(() => {
  const sdSystemConfig = inject(SdSystemConfigProvider);
  const appAuth = inject(AppAuthProvider);
  const appOrm = inject(AppOrmProvider);

  sdSystemConfig.fn = {
    set: async (key, val) => {
      const employeeId = appAuth.authInfo()?.employeeId;
      if (employeeId == null) return; // 로그인 전에는 저장하지 않음

      await appOrm.connectAsync(async (db) => {
        await db
          .employeeConfig()
          .where((item) => [expr.eq(item.employeeId, employeeId), expr.eq(item.code, key)])
          .upsert(
            () => ({ valueJson: json.stringify(val) }),
            (updateRecord) => ({ ...updateRecord, employeeId, code: key }),
          );
      });
    },
    get: async (key) => {
      const employeeId = appAuth.authInfo()?.employeeId;
      if (employeeId == null) return; // 로그인 전에는 조회 불가 → undefined

      return appOrm.connectAsync(async (db) => {
        const row = await db
          .employeeConfig()
          .where((item) => [expr.eq(item.employeeId, employeeId), expr.eq(item.code, key)])
          .single();
        return row?.valueJson != null ? json.parse(row.valueJson) : undefined;
      });
    },
  };
});
```

- `key` 는 설정 항목 식별자(예: 시트 키)이고, 값은 `json.stringify` 로 저장한 뒤 `get` 에서 `json.parse` 로 복원합니다.
- 로그인 전(`employeeId == null`) 에는 `set` 을 건너뛰고 `get` 은 `undefined` 를 반환합니다.
  - 인증 사용자별 설정이라 비로그인 상태로 저장하지 않습니다.
- DB 에 둘 땐 `(employeeId, code)` 로 항목을 식별하는 사용자별 설정 테이블이 필요합니다.
  - 스키마 정의는 [orm.md](./orm.md) 를 참조하세요.

## 지킬 것

- `fn` 은 부트스트랩(`provideAppInitializer`) 에서 1회만 할당하세요. 화면, 서비스 코드에서 재할당하지 마세요.
- `fn` 미배선이면 자동으로 `localStorage` 로 폴백합니다. 기기 로컬 저장으로 충분하면 배선이 불필요합니다.
- 설정값은 `json` 으로 직렬화, 역직렬화하여 컴포넌트가 넘긴 객체를 그대로 보존하세요.

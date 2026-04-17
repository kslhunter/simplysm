# sd-simplysm14: @simplysm v14 소비앱 가이드

소비앱이 `@simplysm/*` v14를 사용할 때 적용되는 지침 및 사용법.

## 중간 패키지(common) 불필요

v14에서는 `import type`으로 타입을 직접 가져올 수 있으므로, 이전 버전에서 클라이언트-서버 간 타입 공유를 위해 필요하던 중간 패키지(예: `service-common`, `orm-common`)가 소비앱의 의존성으로 불필요하다.

```typescript
// v14: 서버 패키지에서 타입을 직접 import — common 패키지 의존성 불필요
import type { ServiceMethods } from "@simplysm/service-server";
```

## 패키지별 상세 문서

| 패키지                                 | 문서                                                              |
| -------------------------------------- | ----------------------------------------------------------------- |
| @simplysm/angular                      | [usage.md](./sd-simplysm14/angular/usage.md)                      |
| @simplysm/capacitor-plugin-auto-update | [usage.md](./sd-simplysm14/capacitor-plugin-auto-update/usage.md) |
| @simplysm/capacitor-plugin-file-system | [usage.md](./sd-simplysm14/capacitor-plugin-file-system/usage.md) |
| @simplysm/capacitor-plugin-intent      | [usage.md](./sd-simplysm14/capacitor-plugin-intent/usage.md)      |
| @simplysm/capacitor-plugin-usb-storage | [usage.md](./sd-simplysm14/capacitor-plugin-usb-storage/usage.md) |
| @simplysm/core-browser                 | [usage.md](./sd-simplysm14/core-browser/usage.md)                 |
| @simplysm/core-common                  | [usage.md](./sd-simplysm14/core-common/usage.md)                  |
| @simplysm/core-node                    | [usage.md](./sd-simplysm14/core-node/usage.md)                    |
| @simplysm/excel                        | [usage.md](./sd-simplysm14/excel/usage.md)                        |
| @simplysm/lint                         | [usage.md](./sd-simplysm14/lint/usage.md)                         |
| @simplysm/orm-common                   | [usage.md](./sd-simplysm14/orm-common/usage.md)                   |
| @simplysm/orm-node                     | [usage.md](./sd-simplysm14/orm-node/usage.md)                     |
| @simplysm/sd-claude                    | [usage.md](./sd-simplysm14/sd-claude/usage.md)                    |
| @simplysm/sd-cli                       | [usage.md](./sd-simplysm14/sd-cli/usage.md)                       |
| @simplysm/service-client               | [usage.md](./sd-simplysm14/service-client/usage.md)               |
| @simplysm/service-common               | [usage.md](./sd-simplysm14/service-common/usage.md)               |
| @simplysm/service-server               | [usage.md](./sd-simplysm14/service-server/usage.md)               |
| @simplysm/storage                      | [usage.md](./sd-simplysm14/storage/usage.md)                      |

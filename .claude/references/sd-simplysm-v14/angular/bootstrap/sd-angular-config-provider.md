# `SdAngularConfigProvider`

`clientName` 설정을 보유하는 프로바이더. [`provideSdAngular`](./provide-sd-angular.md)에서 자동 설정된다.

```typescript
@Injectable({ providedIn: "root" })
class SdAngularConfigProvider {
  clientName!: string;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `clientName` | property | `string` | 클라이언트 이름 |

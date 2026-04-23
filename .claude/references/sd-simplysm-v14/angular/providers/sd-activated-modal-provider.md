# `SdActivatedModalProvider`

모달 내부에서 inject하여 모달/컨텐츠 컴포넌트 참조를 얻는 프로바이더. `@Injectable()`로 모달별 인스턴스 생성.

```typescript
@Injectable()
class SdActivatedModalProvider<T extends SdModalContentDef<any> = SdModalContentDef<any>> {
  modalComponent = signal<any>(undefined);
  contentComponent = signal<T | undefined>(undefined);
  canDeactivateFn: () => boolean;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `modalComponent` | property | `WritableSignal<any>` | SdModal 인스턴스 |
| `contentComponent` | property | `WritableSignal<T \| undefined>` | 컨텐츠 컴포넌트 인스턴스 |
| `canDeactivateFn` | property | `() => boolean` | 모달 닫기 가능 여부 판별 함수 (기본: `() => true`) |

## Usage

모달 내부 컴포넌트에서 `optional: true`로 inject하여 모달 컨텍스트를 확인한다. 타이틀 계산은 `injectViewTitleSignal()`이 내부에서 `SdActivatedModalProvider`를 자동으로 처리하므로 직접 inject할 필요가 없다:

```typescript
// 타이틀 — injectViewTitleSignal()이 modal/page 분기를 자동 처리
protected readonly viewTitle = injectViewTitleSignal();

// canDeactivateFn 등 모달 컨텍스트가 직접 필요한 경우에만 inject
private readonly _sdActivatedModal = inject(SdActivatedModalProvider, { optional: true });
```

`optional: true`를 사용하는 이유: 동일 컴포넌트가 page 뷰로도 사용될 수 있으며, page 뷰에서는 `SdActivatedModalProvider`가 제공되지 않는다.

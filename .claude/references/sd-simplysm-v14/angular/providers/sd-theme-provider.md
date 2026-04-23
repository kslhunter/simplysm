# `SdThemeProvider`

다크모드/폰트 크기 프로바이더. `dark` signal 변경 시 body에 `sd-theme-dark` 클래스를 토글하고, `fontSize` signal 변경 시 `html` 요소의 font-size를 설정한다.

```typescript
@Injectable({ providedIn: "root" })
class SdThemeProvider {
  dark = signal<boolean>(false);
  readonly fontSizePresets: readonly number[] = [12, 14, 16, 20, 24, 28];
  fontSize = signal<number>(12);

  increaseFontSize(): void;
  decreaseFontSize(): void;
}
```

## Members

| Member | Kind | Type | Description |
|--------|------|------|-------------|
| `dark` | property | `WritableSignal<boolean>` | 다크모드 활성화 여부 |
| `fontSizePresets` | property | `readonly number[]` | 사용 가능한 폰트 크기 프리셋 배열 |
| `fontSize` | property | `WritableSignal<number>` | 현재 폰트 크기 (px). 기본값 12 |
| `increaseFontSize()` | method | `() => void` | `fontSizePresets`에서 현재보다 큰 다음 크기로 변경 |
| `decreaseFontSize()` | method | `() => void` | `fontSizePresets`에서 현재보다 작은 이전 크기로 변경 |

## Related Types

### `SdThemeSelector`

테마 설정 드롭다운 컴포넌트. 다크모드 토글과 폰트 크기 증감 버튼을 제공한다. `SdThemeProvider`를 inject하여 사용한다.

```typescript
@Component({ selector: "sd-theme-selector", standalone: true })
class SdThemeSelector {}
```

inputs 없음. `SdThemeProvider`의 `dark`, `fontSize`를 직접 조작한다.

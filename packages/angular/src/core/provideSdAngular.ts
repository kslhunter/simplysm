import type { EnvironmentProviders } from "@angular/core";
import {
  DestroyRef,
  effect,
  EnvironmentInjector,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  PLATFORM_ID,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { IMAGE_CONFIG, isPlatformBrowser } from "@angular/common";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { SwUpdate } from "@angular/service-worker";
import { provideNgIconsConfig } from "@ng-icons/core";
import { SdBusyProvider } from "./busy/sd-busy.provider";
import { SdAngularConfigProvider } from "./config/sd-angular-config.provider";
import { SD_THEMES, SdThemeProvider } from "../features/theme/sd-theme-provider";
import { SdLocalStorageProvider } from "./config/sd-local-storage.provider";
import { SdGlobalErrorHandlerPlugin } from "./error-handler/sd-global-error-handler.plugin";
import { SdOptionEventPlugin } from "./events/sd-option-event.plugin";
import { createLogger } from "@simplysm/core-common";

const logger = createLogger("angular:sw-update");
const themeLogger = createLogger("angular:theme");

export function provideSdAngular(opt: { clientName: string }): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true,
      },
    },
    // size 는 지정하지 않음 — 인라인 스타일로 박혀 styles.scss 의
    // line-height 연동 calc(--ng-icon__size)를 덮어버림.
    provideNgIconsConfig({
      strokeWidth: 1.5,
    }),
    provideEnvironmentInitializer(() => {
      // SSR(프리렌더) 가드: 테마 저장·복원은 브라우저 전용
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

      const sdTheme = inject(SdThemeProvider);
      const sdLocalStorage = inject(SdLocalStorageProvider);

      const savedTheme = sdLocalStorage.get("sd-theme");
      if (savedTheme != null) {
        const matched = SD_THEMES.find((def) => def.value === savedTheme);
        if (matched != null) {
          sdTheme.theme.set(matched.value);
        } else {
          // 저장된 테마가 내장 목록에 없음(구버전 제거 등) — 기본 테마 유지 + 사용자 인지용 경고
          themeLogger.warn(
            `저장된 테마 '${String(savedTheme)}' 가 내장 테마 목록에 없어 기본 테마로 표시합니다.`,
          );
        }
      }

      let prevTheme = sdTheme.theme();
      effect(() => {
        const theme = sdTheme.theme();
        if (theme !== prevTheme) {
          sdLocalStorage.set("sd-theme", theme);
          prevTheme = theme;
        }
      });

      const savedFontSize = sdLocalStorage.get("sd-theme-font-size");
      if (savedFontSize != null) {
        sdTheme.fontSize.set(savedFontSize);
      }

      let prevFontSize = sdTheme.fontSize();
      effect(() => {
        const fontSize = sdTheme.fontSize();
        if (fontSize !== prevFontSize) {
          sdLocalStorage.set("sd-theme-font-size", fontSize);
          prevFontSize = fontSize;
        }
      });
    }),
    provideEnvironmentInitializer(() => {
      // SSR(프리렌더) 가드: window 전역 에러 리스너는 브라우저 전용
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

      const envInjector = inject(EnvironmentInjector);

      const rejectionListener = (event: PromiseRejectionEvent) => {
        event.preventDefault();
        const errorHandler = envInjector.get(ErrorHandler);
        errorHandler.handleError(event);
      };

      const errorListener = (event: ErrorEvent) => {
        event.preventDefault();
        const errorHandler = envInjector.get(ErrorHandler);
        errorHandler.handleError(event);
      };

      window.addEventListener("unhandledrejection", rejectionListener);
      window.addEventListener("error", errorListener);
      inject(DestroyRef).onDestroy(() => {
        window.removeEventListener("error", errorListener);
        window.removeEventListener("unhandledrejection", rejectionListener);
      });
    }),
    {
      provide: SdAngularConfigProvider,
      useFactory: () => {
        const provider = new SdAngularConfigProvider();
        provider.clientName = opt.clientName;
        return provider;
      },
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin },
    provideZonelessChangeDetection(),
    provideAppInitializer(() => {
      // SSR(프리렌더) 가드: 서비스워커 업데이트 확인은 브라우저 전용
      if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

      const swUpdate = inject(SwUpdate, { optional: true });
      const destroyRef = inject(DestroyRef);
      let timerId: ReturnType<typeof setTimeout> | undefined;
      let failCount = 0;
      const BASE_INTERVAL = 5 * 60 * 1000;
      const MAX_INTERVAL = 60 * 60 * 1000;

      const updateFn = async () => {
        try {
          if (swUpdate?.isEnabled) {
            if (await swUpdate.checkForUpdate()) {
              if (
                window.confirm(
                  "클라이언트가 업데이트되었습니다. 새로고침하시겠습니까?\n\n" +
                    "  - 새로고침하지 않으면 몇몇 기능이 정상적으로 동작하지 않을 수 있습니다.",
                )
              ) {
                await swUpdate.activateUpdate();
                window.location.reload();
              }
            }
          }
          failCount = 0;
        } catch (err) {
          failCount++;
          logger.error(err);
        } finally {
          const interval = Math.min(
            BASE_INTERVAL * Math.pow(2, Math.max(0, failCount - 1)),
            MAX_INTERVAL,
          );
          timerId = setTimeout(updateFn, interval);
        }
      };
      void updateFn();

      destroyRef.onDestroy(() => {
        if (timerId != null) {
          clearTimeout(timerId);
        }
      });
    }),
    provideAppInitializer(() => {
      const router = inject(Router, { optional: true });
      if (router == null) return;
      const sdBusy = inject(SdBusyProvider);
      const navEvent = toSignal(router.events);
      effect(() => {
        const event = navEvent();
        if (event instanceof NavigationStart) {
          sdBusy.globalBusyCount.update((v) => v + 1);
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          sdBusy.globalBusyCount.update((v) => Math.max(0, v - 1));
        }
      });
    }),
  ]);
}

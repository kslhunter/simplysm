import { SdAngularConfigProvider } from "./providers/app/sd-angular-config.provider";
import type { EnvironmentProviders } from "@angular/core";
import {
  DestroyRef,
  EnvironmentInjector,
  ErrorHandler,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "./plugins/commands/sd-save-command-event.plugin";
import { SdRefreshCommandEventPlugin } from "./plugins/commands/sd-refresh-command-event.plugin";
import { SdInsertCommandEventPlugin } from "./plugins/commands/sd-insert-command-event.plugin";
import { SdResizeEventPlugin } from "./plugins/events/sd-resize-event.plugin";
import { SdOptionEventPlugin } from "./plugins/events/sd-option-event.plugin";
import { SdBackbuttonEventPlugin } from "./plugins/events/sd-backbutton-event.plugin";
import type { TSdTheme } from "./providers/sd-theme-provider";
import { SdThemeProvider } from "./providers/sd-theme-provider";
import { SdLocalStorageProvider } from "./providers/storage/sd-local-storage.provider";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { SdBusyProvider } from "../ui/overlay/busy/sd-busy.provider";
import { SwUpdate } from "@angular/service-worker";
import { SdGlobalErrorHandlerPlugin } from "./plugins/sd-global-error-handler.plugin";
import { IMAGE_CONFIG } from "@angular/common";
import { provideNgIconsConfig } from "@ng-icons/core";

export function provideSdAngular(opt: {
  clientName: string;
  defaultTheme: TSdTheme;
  defaultDark: boolean;
  // icons: ISdAngularIcon;
}): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
        disableImageLazyLoadWarning: true,
      },
    },
    provideNgIconsConfig({
      strokeWidth: 1.5,
      size: "1.33em",
    }),
    provideEnvironmentInitializer(() => {
      const _sdNgConf = inject(SdAngularConfigProvider);
      const _sdTheme = inject(SdThemeProvider);
      const _sdLocalStorage = inject(SdLocalStorageProvider);

      _sdTheme.theme.set(_sdLocalStorage.get("sd-theme") ?? _sdNgConf.defaultTheme);
      _sdTheme.dark.set(_sdLocalStorage.get("sd-theme-dark") ?? _sdNgConf.defaultDark);
    }),
    provideEnvironmentInitializer(() => {
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
        provider.defaultTheme = opt.defaultTheme;
        provider.defaultDark = opt.defaultDark;
        // provider.icons = opt.icons;
        return provider;
      },
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdBackbuttonEventPlugin, multi: true },
    { provide: ErrorHandler, useClass: SdGlobalErrorHandlerPlugin },
    provideZonelessChangeDetection(),

    //-- 페이지 이동시 로딩 표시
    provideAppInitializer(() => {
      const router = inject(Router, { optional: true });
      if (!router) return;

      const sdBusy = inject(SdBusyProvider);

      router.events.subscribe((event) => {
        if (event instanceof NavigationStart) {
          sdBusy.globalBusyCount.update((v) => v + 1);
        } else if (
          event instanceof NavigationEnd ||
          event instanceof NavigationCancel ||
          event instanceof NavigationError
        ) {
          sdBusy.globalBusyCount.update((v) => v - 1);
        }
      });
    }),

    //-- SwUpdate
    provideAppInitializer(() => {
      const swUpdate = inject(SwUpdate, { optional: true });

      const updateFn = async () => {
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

        setTimeout(updateFn, 5 * 60 * 1000);
      };
      void updateFn();
    }),
  ]);
}

import { ISdAngularIcon, SdAngularConfigProvider } from "./providers/sd-angular-config.provider";
import {
  DestroyRef,
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
  provideZonelessChangeDetection,
} from "@angular/core";
import { EVENT_MANAGER_PLUGINS } from "@angular/platform-browser";
import { SdSaveCommandEventPlugin } from "./plugins/commands/sd-save-command.event-plugin";
import { SdRefreshCommandEventPlugin } from "./plugins/commands/sd-refresh-command.event-plugin";
import { SdInsertCommandEventPlugin } from "./plugins/commands/sd-insert-command.event-plugin";
import { SdResizeEventPlugin } from "./plugins/events/sd-resize.event-plugin";
import { SdOptionEventPlugin } from "./plugins/events/sd-option.event-plugin";
import { SdBackbuttonEventPlugin } from "./plugins/events/sd-backbutton.event-plugin";
import { SdThemeProvider, TSdTheme } from "./providers/sd-theme.provider";
import { SdLocalStorageProvider } from "./providers/sd-local-storage.provider";
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from "@angular/router";
import { SdBusyProvider } from "./providers/sd-busy.provider";
import { SwUpdate } from "@angular/service-worker";
import { DOCUMENT } from "@angular/common";
import { SdSystemLogProvider } from "./providers/sd-system-log.provider";

export function provideSdAngular(opt: {
  clientName: string;
  defaultTheme?: TSdTheme;
  defaultDark?: boolean;
  icons: ISdAngularIcon;
}): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideEnvironmentInitializer(() => {
      const _sdNgConf = inject(SdAngularConfigProvider);
      const _sdTheme = inject(SdThemeProvider);
      const _sdLocalStorage = inject(SdLocalStorageProvider);

      _sdTheme.theme.set(_sdLocalStorage.get("sd-theme") ?? _sdNgConf.defaultTheme);
      _sdTheme.dark.set(_sdLocalStorage.get("sd-theme-dark") ?? _sdNgConf.defaultDark);
    }),
    provideEnvironmentInitializer(() => {
      // const appRef = inject(ApplicationRef);
      const sdSystemLog = inject(SdSystemLogProvider);
      const window = inject(DOCUMENT).defaultView;

      if (!window) return;

      const displayErrorMessage = (message: string) => {
        const divEl = document.createElement("div");
        divEl.style.position = "fixed";
        divEl.style.top = "0";
        divEl.style.left = "0";
        divEl.style.width = "100%";
        divEl.style.height = "100%";
        divEl.style.color = "white";
        divEl.style.background = "rgba(0,0,0,.6)";
        divEl.style.zIndex = "9999";
        divEl.style.overflow = "auto";
        divEl.style.padding = "4px";

        divEl.innerHTML = `<pre style="font-size: 12px; font-family: monospace; line-height: 1.4em;">${message}</pre>`;

        // appRef.destroy();

        document.body.append(divEl);
        divEl.onclick = () => {
          location.reload();
        };

        void sdSystemLog.writeAsync("error", message);
      };

      const rejectionListener = (event: PromiseRejectionEvent) => {
        const reason = event.reason;

        if (reason instanceof Error) {
          displayErrorMessage(`[Unhandled Promise Rejection]
Message : ${reason.message}
Stack   : ${reason.stack ?? "(no stack)"}`);
        } else if (typeof reason === "object" && reason !== null) {
          displayErrorMessage(`[Unhandled Promise Rejection]
Reason  : ${JSON.stringify(reason, null, 2)}`);
        } else {
          displayErrorMessage(`[Unhandled Promise Rejection]
Reason  : ${String(reason)}`);
        }

        event.preventDefault();
      };

      const errorListener = (event: ErrorEvent) => {
        const { message, filename, lineno, colno, error } = event;

        if (error == null) {
          void sdSystemLog.writeAsync("warn", message);
          event.preventDefault();
          return;
        }

        let stack = "";
        if (error?.stack != null) {
          stack = "\n" + error.stack;
        }

        displayErrorMessage(`[Uncaught Error]
Message : ${message}
Source  : ${filename}(${lineno}, ${colno})${stack}`);
        event.preventDefault();
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
        provider.defaultTheme = opt.defaultTheme ?? "compact";
        provider.defaultDark = opt.defaultDark ?? false;
        provider.icons = opt.icons;
        return provider;
      },
    },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdSaveCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdRefreshCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdInsertCommandEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdResizeEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdOptionEventPlugin, multi: true },
    { provide: EVENT_MANAGER_PLUGINS, useClass: SdBackbuttonEventPlugin, multi: true },
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

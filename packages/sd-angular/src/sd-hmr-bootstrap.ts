/* eslint-disable no-console */
import {
  ApplicationConfig,
  ApplicationRef,
  destroyPlatform,
  Type,
  ɵresetCompiledComponents,
} from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";

export async function sdHmrBootstrapAsync(
  rootComponent: Type<unknown>,
  options?: ApplicationConfig,
): Promise<ApplicationRef> {
  if ("cordova" in window) {
    return await new Promise<ApplicationRef>((resolve) => {
      document.addEventListener("deviceready", bootstrap, false);
      async function bootstrap() {
        try {
          const appRef = await bootstrapApplication(rootComponent, options);

          if (typeof ngDevMode === "undefined" || ngDevMode) {
            Object.assign(window, {
              __sd_hmr_destroy: () => {
                document.removeEventListener("deviceready", bootstrap, false);
                ɵresetCompiledComponents();
                appRef.destroy();
                destroyPlatform();
              },
            });
          }

          resolve(appRef);
        } catch (err) {
          alert(err);
          console.error(err);
          throw err;
        }
      }
    });
  } else {
    try {
      const appRef = await bootstrapApplication(rootComponent, options);

      if (typeof ngDevMode === "undefined" || ngDevMode) {
        Object.assign(window, {
          __sd_hmr_destroy: () => {
            ɵresetCompiledComponents();
            appRef.destroy();
            destroyPlatform();
          },
        });
      }

      return appRef;
    } catch (err) {
      alert(err);
      console.error(err);
      throw err;
    }
  }
}

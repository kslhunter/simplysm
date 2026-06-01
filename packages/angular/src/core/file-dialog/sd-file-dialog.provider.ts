import { wait } from "@simplysm/core-common";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdFileDialogProvider {
  async showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  async showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
  async showAsync(multiple?: boolean, accept?: string): Promise<File[] | File | undefined> {
    return new Promise<File[] | File | undefined>((resolve) => {
      let inputEl: HTMLInputElement | undefined = document.createElement("input");

      function cleanup(): void {
        if (inputEl) {
          document.body.removeChild(inputEl);
          inputEl = undefined;
        }
      }

      inputEl.type = "file";
      inputEl.multiple = multiple ?? false;
      if (accept != null) {
        inputEl.accept = accept;
      }
      inputEl.onchange = (event: Event): void => {
        cleanup();
        const files = (event.target as HTMLInputElement).files;
        if (files == null) {
          resolve(undefined);
          return;
        }
        resolve(multiple ? Array.from(files) : files[0]);
      };

      // cancel 이벤트 (Chrome 77+)
      inputEl.addEventListener("cancel", () => {
        cleanup();
        resolve(undefined);
      });

      inputEl.style.opacity = "0";
      inputEl.style.position = "fixed";
      inputEl.style.top = "0";
      inputEl.style.left = "0";
      inputEl.style.pointerEvents = "none";
      document.body.appendChild(inputEl);
      inputEl.focus();
      inputEl.click();

      // focus 폴백 (Chrome 61-76)
      setTimeout(() => {
        if (inputEl == null) return;
        inputEl.onfocus = async (): Promise<void> => {
          await wait.time(1000);
          if (inputEl) {
            cleanup();
            resolve(undefined);
          }
        };
      });
    });
  }
}

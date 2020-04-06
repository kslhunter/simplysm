import {Wait} from "@simplysm/sd-core-common";
import {Injectable} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdFileDialogRootProvider {
  public async showAsync<T extends boolean>(multiple?: T, accept?: string): Promise<(T extends true ? File[] : File) | undefined> {
    // noinspection UnnecessaryLocalVariableJS
    const result = await new Promise<(T extends true ? File[] : File) | undefined>(resolve => {
      let inputEl: HTMLInputElement | undefined = document.createElement("input");

      inputEl.type = "file";
      inputEl.multiple = multiple ?? false;
      if (accept !== undefined) {
        inputEl.accept = accept;
      }
      inputEl.onchange = (event: Event): void => {
        if (inputEl) {
          document.body.removeChild(inputEl);
          inputEl = undefined;
        }

        const files = event.target!["files"];
        resolve(multiple ? files : files[0]);
      };
      inputEl.style.opacity = "0";
      inputEl.style.position = "fixed";
      inputEl.style.top = "0";
      inputEl.style.left = "0";
      inputEl.style.pointerEvents = "none";
      document.body.appendChild(inputEl);
      inputEl.focus();
      inputEl.click();

      inputEl.onfocus = async (): Promise<void> => {
        await Wait.time(1000);
        if (inputEl) {
          document.body.removeChild(inputEl);
          inputEl = undefined;
        }

        resolve();
      };
    });

    return result;
  }
}
import {Wait} from "@simplysm/sd-core";

export class SdFileDialogProvider {
  public async showAsync<T extends boolean>(multiple?: T): Promise<(T extends true ? File[] : File) | undefined> {
    return await new Promise<(T extends true ? File[] : File) | undefined>(resolve => {
      let inputEl: HTMLInputElement | undefined = document.createElement("input");
      inputEl.type = "file";
      inputEl.multiple = multiple || false;
      inputEl.onchange = (event: Event) => {
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

      inputEl.onfocus = async () => {
        await Wait.time(1000);
        if (inputEl) {
          document.body.removeChild(inputEl);
          inputEl = undefined;
        }

        resolve();
      };
    });
  }
}

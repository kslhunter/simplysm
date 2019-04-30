import {Wait} from "@simplysm/sd-common";

export class SdFileDialogProvider {
  public async showAsync(): Promise<File | undefined> {
    return await new Promise<File | undefined>(resolve => {
      let inputEl: HTMLInputElement | undefined = document.createElement("input");
      inputEl.type = "file";
      inputEl.multiple = false;
      inputEl.onchange = (event: Event) => {
        if (inputEl) {
          document.body.removeChild(inputEl);
          inputEl = undefined;
        }

        const file = event.target!["files"][0];
        resolve(file);
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
        await Wait.time(100);
        if (inputEl) {
          document.body.removeChild(inputEl);
          inputEl = undefined;
        }
        resolve();
      };
    });
  }
}
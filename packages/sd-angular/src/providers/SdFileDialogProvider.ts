import { Wait } from "@simplysm/sd-core-common";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdFileDialogProvider {
  /**
   * 비동기 방식으로 파일 선택 대화상자를 표시하는 메서드입니다.
   * 사용자가 파일을 선택하면, 해당 파일 정보를 반환합니다.
   *
   * @example
   * const file = await this.#sdFileDialog.showAsync(false, "image/*");
   * if (!file) return;
   *
   * const arr = await new Promise<Uint8Array>((resolve) => {
   *   const fileReader = new FileReader();
   *   fileReader.onload = () => {
   *     resolve(new Uint8Array(fileReader.result as ArrayBuffer));
   *   };
   *   fileReader.readAsArrayBuffer(file);
   * });
   *
   * @param multiple 여러 파일을 선택할 수 있는지 여부를 결정합니다. 기본값은 false입니다.
   * @param accept 선택 가능한 파일의 유형을 지정하는 문자열로, MIME 타입(예: 'image/png') 혹은 확장자(예: '.png,.jpg')로 작성됩니다.
   * @return 사용자가 선택한 파일 객체를 반환하며, 파일을 선택하지 않으면 undefined를 반환합니다.
   */
  async showAsync(multiple?: false, accept?: string): Promise<File | undefined>;
  async showAsync(multiple: true, accept?: string): Promise<File[] | undefined>;
  async showAsync(multiple?: boolean, accept?: string): Promise<File[] | File | undefined> {
    return await new Promise<File[] | File | undefined>((resolve) => {
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

      setTimeout(() => {
        inputEl!.onfocus = async (): Promise<void> => {
          await Wait.time(1000);
          if (inputEl) {
            document.body.removeChild(inputEl);
            inputEl = undefined;
          }

          resolve(undefined);
        };
      });
    });
  }
}

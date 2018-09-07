export class SdFileDialogProvider {
  public async showAsync(): Promise<File | undefined> {
    return await new Promise<File | undefined>(resolve => {
      const inputEl = document.createElement("input");
      inputEl.type = "file";
      inputEl.multiple = false;
      inputEl.onchange = (event: Event) => {
        const file = event.target!["files"][0];
        resolve(file);
      };
      inputEl.click();
    });
  }
}
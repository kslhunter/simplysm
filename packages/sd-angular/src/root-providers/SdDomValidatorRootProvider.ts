import {Injectable} from "@angular/core";

@Injectable({providedIn: "root"})
export class SdDomValidatorRootProvider {
  public validate(element: HTMLElement): void {
    const invalidEls = element.findAll("*:invalid, *[sd-invalid=true]").ofType(HTMLElement);

    if (invalidEls.length > 0) {
      const focusableElement: HTMLElement | undefined = invalidEls[0].isFocusable() ? invalidEls[0] : invalidEls[0].findFocusableAll()[0];
      if (focusableElement !== undefined) {
        // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "setTimeout"이 필요함.
        setTimeout(() => {
          focusableElement.focus();
        });
      }
      else {
        const firstCell = invalidEls[0].findParent("._col");
        if (firstCell) {
          // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "setTimeout"이 필요함.
          setTimeout(() => {
            firstCell.focus();
          });
        }
      }

      const invalidLabelsText = invalidEls.map(item => {
        const formItem = item.findParent("sd-form-item");
        if (formItem) {
          return formItem.getAttribute("sd-label");
        }

        const cell = item.findParent("._col");
        if (cell) {
          const index = cell.findParent("._row")!.findAll("._col").indexOf(cell);
          const headerCell = cell.findParent("sd-sheet")!.findAll("._head ._row").last()!.findAll("._col")[index];
          return headerCell.getAttribute("sd-header") ?? headerCell.textContent!.trim();
        }

        return "";
      }).filterExists().distinct().join(", ");

      throw new Error("입력값이 잘못되었습니다" + (invalidLabelsText !== undefined ? ": " + invalidLabelsText : "."));
    }
  }
}
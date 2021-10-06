import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class SdDomValidatorRootProvider {
  public validate(element: HTMLElement): void {
    const invalidEls = element.findAll("*:invalid, *[sd-invalid=true]").ofType(HTMLElement);

    if (invalidEls.length > 0) {
      const focusableElement = invalidEls[0].isFocusable() ? invalidEls[0] : invalidEls[0].findFocusableAll()[0];
      if (typeof focusableElement !== "undefined") {
        // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "setTimeout"이 필요함.
        setTimeout(() => {
          focusableElement.focus();
        });
      }
      else {
        const firstCell = invalidEls[0].findParent("._cell");
        if (firstCell) {
          // "confirm"창울 띄우는 경우에 포커싱이 안되는 현상 때문에 "setTimeout"이 필요함.
          setTimeout(() => {
            firstCell.focus();
          });
        }
      }

      const invalidLabelsText = invalidEls
        .map((item) => {
          const formItem = item.findParent("sd-form-item");
          if (formItem) {
            return formItem.getAttribute("label");
          }

          const cell = item.findParent("._cell");
          if (cell) {
            const index = cell.findParent("._row")!.findAll("._cell").indexOf(cell);
            const headerCell = cell.findParent("._sheet")!.findAll("._head ._header-row")[0].findAll("._cell")[index];
            return headerCell.getAttribute("sd-header") ?? headerCell.textContent!.trim();
          }

          return "";
        })
        .filterExists()
        .distinct()
        .join(", ");

      throw new Error("입력값이 잘못되었습니다: " + invalidLabelsText);
    }
  }
}
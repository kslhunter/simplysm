import {Injectable} from "@angular/core";

@Injectable()
export class SdDomValidatorProvider {
  public validate(element: HTMLElement): void {
    const invalidEls = element.findAll("*:invalid, *[sd-invalid=true]").ofType(HTMLElement);

    if (invalidEls.length > 0) {
      const focusableElement = invalidEls[0].findFocusableAllIncludeMe()[0];
      if (focusableElement) {
        focusableElement.focus();
      }

      if (!focusableElement) {
        const firstCell = invalidEls[0].findParent("._col");
        if (firstCell) {
          (firstCell as HTMLElement).focus();
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
          return headerCell.getAttribute("sd-header") || headerCell.textContent!.trim();
        }

        return "";
      }).filterExists().distinct().join(", ");

      throw new Error("입력값이 잘못되었습니다" + (invalidLabelsText ? ": " + invalidLabelsText : "."));
    }
  }
}
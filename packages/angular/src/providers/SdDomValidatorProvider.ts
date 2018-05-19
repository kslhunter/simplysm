import {Injectable} from "@angular/core";

@Injectable()
export class SdDomValidatorProvider {
  public constructor() {
  }

  public validate(element: HTMLElement): HTMLElement[] {
    const invalidEls = element.findAll("*:invalid, *[sd-invalid=true]");

    if (invalidEls.length > 0) {
      invalidEls[0].focus();

      const invalidLabelsText = invalidEls.map(item => {
        const parent = item.findParent("sd-form-item");
        return parent && parent.getAttribute("sd-label");
      }).filterExists().distinct().join(", ");

      throw new Error("입력값이 잘못되었습니다.\r\n" + invalidLabelsText);
    }

    return invalidEls;
  }
}
import { Component } from "@angular/core";
import { SdButton } from "../../../../src/ui/form/button/sd-button";
import { SdAnchor } from "../../../../src/ui/form/button/sd-anchor";
import { SdAdditionalButton } from "../../../../src/ui/form/button/sd-additional-button";

@Component({
  selector: "sd-button-default-test",
  template: `<sd-button>Click me</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonDefaultTest {}

@Component({
  selector: "sd-button-theme-test",
  template: `<sd-button [theme]="'primary'">Primary</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonThemeTest {}

@Component({
  selector: "sd-button-link-test",
  template: `<sd-button [theme]="'link'">Link</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonLinkTest {}

@Component({
  selector: "sd-button-link-rev-test",
  template: `<sd-button [theme]="'link-rev'">Link Rev</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonLinkRevTest {}

@Component({
  selector: "sd-button-size-sm-test",
  template: `<sd-button [size]="'sm'">Small</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonSizeSmTest {}

@Component({
  selector: "sd-button-inline-test",
  template: `<sd-button [inline]="true">Inline</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonInlineTest {}

@Component({
  selector: "sd-button-inset-test",
  template: `<sd-button [inset]="true">Inset</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonInsetTest {}

@Component({
  selector: "sd-button-disabled-test",
  template: `<sd-button [disabled]="true">Disabled</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonDisabledTest {}

@Component({
  selector: "sd-button-submit-test",
  template: `<sd-button [type]="'submit'">Submit</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonSubmitTest {}

@Component({
  selector: "sd-button-custom-test",
  template: `<sd-button [buttonStyle]="'width: 200px'" [buttonClass]="'my-class'">Custom</sd-button>`,
  standalone: true,
  imports: [SdButton],
})
export class SdButtonCustomTest {}

// --- sd-anchor fixtures ---

@Component({
  selector: "sd-anchor-default-test",
  template: `<sd-anchor>Link</sd-anchor>`,
  standalone: true,
  imports: [SdAnchor],
})
export class SdAnchorDefaultTest {}

@Component({
  selector: "sd-anchor-theme-test",
  template: `<sd-anchor [theme]="'danger'">Danger</sd-anchor>`,
  standalone: true,
  imports: [SdAnchor],
})
export class SdAnchorThemeTest {}

@Component({
  selector: "sd-anchor-disabled-test",
  template: `<sd-anchor [disabled]="true">Disabled</sd-anchor>`,
  standalone: true,
  imports: [SdAnchor],
})
export class SdAnchorDisabledTest {}

// --- sd-additional-button fixtures ---

@Component({
  selector: "sd-additional-button-default-test",
  template: `
    <sd-additional-button>
      <span>Content</span>
      <sd-anchor [theme]="'danger'">Cancel</sd-anchor>
      <sd-button [inset]="true">Search</sd-button>
    </sd-additional-button>
  `,
  standalone: true,
  imports: [SdAdditionalButton, SdAnchor, SdButton],
})
export class SdAdditionalButtonDefaultTest {}

@Component({
  selector: "sd-additional-button-size-test",
  template: `<sd-additional-button [size]="'sm'">Content</sd-additional-button>`,
  standalone: true,
  imports: [SdAdditionalButton],
})
export class SdAdditionalButtonSizeTest {}

@Component({
  selector: "sd-additional-button-inset-test",
  template: `<sd-additional-button [inset]="true">Content</sd-additional-button>`,
  standalone: true,
  imports: [SdAdditionalButton],
})
export class SdAdditionalButtonInsetTest {}

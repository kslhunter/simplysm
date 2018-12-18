import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdIcon = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-icon {
    display: inline-block;
    pointer-events: none;

    &[sd-fixed-width=true] {
      width: 1.25em;
    }

    .fa-layers-counter {
      transform: scale(0.4);
    }

    &[sd-dot=true] svg:nth-child(2) {
      color: ${vars.themeColor.danger.default};
    }
  }`;
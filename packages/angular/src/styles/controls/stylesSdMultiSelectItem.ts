import {SdStyleProvider} from "../../provider/SdStyleProvider";

export const stylesSdMultiSelectItem = (vars: SdStyleProvider) => /* language=LESS */ `
  sd-multi-select-item {
    display: block;
    padding: ${vars.gap.xs} ${vars.gap.sm};
    cursor: pointer;
    /*font-size: font-size(sm);*/

    &:hover {
      background: ${vars.transColor.dark};
    }

    > sd-checkbox > label {
      padding: 0 !important;
    }

    &[hidden] {
      display: none;
    }
  }`;